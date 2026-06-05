const { utils } = require('automata-utils');

const { createNotSupported } = require('../errors');
const escapePath = require('../utils/escape-path');
const exec = require('../cli/exec-promisified');

const { logger } = utils;
// [webm @ 0x5b58e2446340] Only VP8 or VP9 or AV1 video and Vorbis or Opus audio
// and WebVTT subtitles are supported for WebM.
// https://support.mozilla.org/en-US/kb/audio-and-video-firefox#w_audio-codecs
// https://www.iana.org/assignments/media-types/media-types.xhtml
// undefined -> default
// null -> transcode
// 1 - not from iana
const codecs = {
  aac: { format: 'mp4', mime: 'audio/aac' },
  ac3: null,
  ass: { format: 'ass', mime: 'subtitle/ass' }, /* 1 */
  av1: { format: 'webm', mime: 'video/AV1' },
  eac3: null,
  h264: { format: 'mp4', mime: 'video/H264' },
  hevc: null, /* { format: 'mp4', mime: 'video/hevc' }, /* 1 */
  mp3: { format: 'mp3', mime: 'audio/mp3' }, /* 1 */
  msmpeg4v2: null,
  opus: { format: 'opus', mime: 'audio/ogg' }, /* 1 */
  vorbis: { format: 'webm', mime: 'audio/vorbis' },
  vp8: { format: 'webm', mime: 'video/VP8' },
  vp9: { format: 'webm', mime: 'video/VP9' },
  webvtt: { format: 'webvtt', mime: 'subtitle/vtt' }, /* 1 */
};

const codecOptions = (codec) => {
  const options = codecs[codec];

  if (options === null) {
    // known to fail, redirect to transcode
    throw createNotSupported({ codec });
  }

  return options || null;
};

const encoders = {
  h264: {
    encoder: 'h264_nvenc',
    encoderOpts: '-pix_fmt yuv420p -preset slow',
    format: 'mp4',
  },
  mp3: {
    encoder: 'libmp3lame',
    encoderOpts: null,
    format: 'mp3',
  },
  opus: {
    encoder: 'libopus',
    encoderOpts: '-ac 2',
    format: 'opus',
  },
  webvtt: {
    encoder: '',
    encoderOpts: '',
    format: 'webvtt',
  },
};

const encoderOptions = (codec) => encoders[codec] || null;

const formats = {
  mp4: { formatOpts: ' -movflags frag_keyframe+empty_moov' },
  webm: { formatOpts: ' -cues_to_front 1' },
};

const formatOptions = (format) => formats[format] || {};

const streamProbe = async (filePath, streamIndex) => {
  const cmd = [
    'ffprobe',
    '-v error',
    `-i "${escapePath(filePath)}"`,
    '-show_entries stream=codec_name',
    `-select_streams ${streamIndex}`,
    '-print_format json',
  ].join(' ');

  // logger.info(cmd);
  const { stdout } = await exec(cmd);

  logger.info(stdout);
  const results = JSON.parse(stdout);

  const { codec_name: codec } = results?.streams[0] || {};

  return { codec };
};

const mime = (type, format) => {
  let mimeType;

  switch (format) {
    case 'ass':
      mimeType = 'subtitle/ass';
      break;
    case 'mp3':
      mimeType = 'audio/mp3';
      break;
    case 'mp4':
      mimeType = `${type}/mp4`;
      break;
    case 'opus':
      mimeType = `${type}/ogg`;
      break;
    case 'webm':
      mimeType = `${type}/webm`;
      break;
    case 'webvtt':
      mimeType = 'subtitle/vtt';
      break;
    // for static
    case null:
      mimeType = `${type}/*`;
      break;
    default:
      logger.warn(`Unhndled format mime: ${type}/${format}`);
      mimeType = `${type}/*`;
      break;
  }

  return mimeType;
};

const copyDefaults = (type) => {
  let format;
  switch (type) {
    case 'audio':
      format = 'mp4';
      break;

    case 'subtitle':
      format = 'ass';
      break;

    case 'video':
      format = 'mp4';
      break;

    default:
      throw new Error(`Unknown type: ${type}`);
  }

  return { format };
};

const copyOptions = (type, codec) => {
  if (![
    'audio',
    'subtitle',
    'video',
  ].includes(type)) throw new Error(`Unknown type: ${type}`);

  let options = codecOptions(codec);

  if (!options) {
    options = copyDefaults(type);
    logger.warn(`Unhandled codec ${type}/${codec}: defaulting to ${options.format}`);
  }

  const { format } = options;

  return { format };
};

const transcodeOptions = (type) => {
  let codec;

  switch (type) {
    case 'audio':
      codec = 'opus';
      break;

    case 'subtitle':
      codec = 'webvtt';
      break;

    case 'video':
      codec = 'h264';
      break;

    default:
      throw new Error(`Unknown type: ${type}`);
  }

  return encoderOptions(codec);
};

module.exports = {
  copyOptions,
  formatOptions,
  mime,
  streamProbe,
  transcodeOptions,
};
