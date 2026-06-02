const { utils } = require('automata-utils');

const probe = require('../cli/probe');
const { createNotSupported } = require('../errors');

const { logger } = utils;
// [webm @ 0x5b58e2446340] Only VP8 or VP9 or AV1 video and Vorbis or Opus audio
// and WebVTT subtitles are supported for WebM.
// https://support.mozilla.org/en-US/kb/audio-and-video-firefox#w_audio-codecs
const isWebm = (format) => /^webm$/iu.test(format);
const isMp4 = (format) => /^mp4$/iu.test(format);
const isMp3 = (format) => /^mp3$/iu.test(format);
const isWebVTT = (format) => /^webvtt$/iu.test(format);
const isAss = (format) => /^ass$/iu.test(format);

const isVorbis = (codec) => /^vorbis$/iu.test(codec);
const isOpus = (codec) => /^opus$/iu.test(codec);
const isVP8 = (codec) => /^vp8$/iu.test(codec);
const isVP9 = (codec) => /^vp9$/iu.test(codec);
const isAV1 = (codec) => /^av1$/iu.test(codec);
const isHevc = (codec) => /^hevc$/iu.test(codec);
const isAc3 = (codec) => /^ac3$/iu.test(codec);
const isMSMpeg4v2 = (codec) => /^msmpeg4v2$/iu.test(codec);
const isAAC = (codec) => /^aac$/iu.test(codec);
const isH264 = (codec) => /^h264$/iu.test(codec);

// const SKIP_WARNING = [
//   // container swap ok
//   // container swap ok
//   { codec: 'flac', format: 'matroska,webm' },
//   // container swap ok
// ];

// const skipWarning = (/*format, codec*/) => false;

//   SKIP_WARNING.some(
//   ({ codec: c, format: f }) => c === codec && f === format,
// );

const mimeToExt = (mime) => {
  const { type, format } = mime.match(/^(?<type>[^/]+)\/(?<format>.+)/u).groups;

  if (type === 'audio' && format === 'mp4') {
    return 'm4a';
  }

  return format;
};

const audioMime = (format, codec = null) => {
  if (codec) return `audio/${codec}`;

  if (isMp4(format)) return 'audio/mp4';

  if (isMp3(format)) return 'audio/mp3';

  if (isWebm(format)) return 'audio/webm';

  return null;
};

const videoMime = (format, codec = null) => {
  if (codec) return `video/${codec}`;

  if (isMp4(format)) return 'video/mp4';

  if (isWebm(format)) return 'video/webm';

  return null;
};

const subtitleMime = (format) => {
  if (isAss(format)) return 'text/ass';

  if (isWebVTT(format)) return 'text/vtt';

  return null;
};

const audioCopyOptions = async (path, streamIndex) => {
  const { audios, format } = await probe(path);
  const { codec } = audios.find(({ index }) => index === streamIndex);

  let codecOptions;
  let mime;

  if (isMp3(codec)) {
    codecOptions = '-c copy -f mp3';
    mime = audioMime('mp3', null);
  } else if (isAc3(codec)) {
    throw createNotSupported({ codec });
  } else if (isVorbis(codec) || isOpus(codec)) {
    codecOptions = '-c copy -f webm';
    mime = audioMime('webm', codec);
  } else if (isMp4(format) || isAAC(codec)) {
    codecOptions = '-c copy -f mp4';
    mime = audioMime('mp4');
  } else {
    logger.warn('Unhandled audio codec / format?', codec, format);

    // default to
    codecOptions = '-c copy -f mp4';
    mime = audioMime('mp4');
  }

  return {
    codecOptions,
    mime,
  };
};

const videoCopyOptions = async (path) => {
  const { format, video } = await probe(path);
  const { codec } = video;

  let codecOptions;
  let mime;

  // hevc:
  // (In some cases? limited support according to mdc)
  // Firefox is capable to decode,
  // but takes much longer than full transcode
  if (isHevc(codec) || isMSMpeg4v2(codec)) {
    throw createNotSupported({ codec });
  } if (isVP8(codec) || isVP9(codec) || isAV1(codec)) {
    codecOptions = '-c copy -f webm';
    mime = videoMime('webm', codec);
  } else if (isMp4(format) || isH264(codec)) {
    codecOptions = '-c copy -f mp4';
    mime = videoMime('mp4');
  } else {
    logger.warn('Unhandled video codec/format ?', codec, format);

    // default to
    codecOptions = '-c copy -f mp4';
    mime = videoMime('mp4');
  }

  return {
    codecOptions,
    mime,
  };
};

const subTitleCopyOptions = async (path, streamIndex) => {
  const probes = await probe(path);
  const subtitle = probes.subtitles.find(({ index }) => index === streamIndex);
  const { codec } = subtitle;

  let codecOptions;
  let mime;

  if (isWebVTT(codec)) {
    codecOptions = '-c copy -f webvtt';
    mime = subtitleMime('webvtt');
  } else if (isAss(codec)) {
    codecOptions = '-c copy -f ass';
    mime = subtitleMime('ass');
  } else {
    console.warn('defaulting to ass', codec);
    codecOptions = '-c copy -f ass';
    mime = subtitleMime('ass');
  }

  return {
    codecOptions,
    mime,
  };
};

const copy = async (type, path, streamIndex) => {
  if (type === 'audio') {
    return audioCopyOptions(path, streamIndex);
  }

  if (type === 'subtitle') {
    return subTitleCopyOptions(path, streamIndex);
  }

  if (type === 'video') {
    return videoCopyOptions(path);
  }

  return null;
};

const transcode = (type) => {
  let codecOptions;
  let mime;

  switch (type) {
    case 'audio':
      codecOptions = '-c:a libmp3lame -f mp3';
      mime = audioMime('mp3');
      break;

    case 'subtitle':
      codecOptions = '-f webvtt';
      mime = subtitleMime('webvtt');
      break;

    case 'video':
      codecOptions = [
        '-c:v h264_nvenc',
        '-pix_fmt yuv420p',
        '-movflags frag_keyframe+empty_moov',
        '-preset slow',
        '-f mp4',
      ].join(' ');
      mime = videoMime('mp4');
      break;

    default:
      throw new Error(`Unknown type: ${type}`);
  }

  return {
    codecOptions,
    mime,
  };
};

const mimeType = async (type, path) => {
  const { format } = await probe(path);

  let mime;
  switch (type) {
    case 'audio':
      mime = audioMime(format);
      break;

    case 'subtitle':
      mime = subtitleMime(format);
      break;

    case 'video':
      mime = videoMime(format);
      break;

    default:
      throw new Error(`Unknown type: ${type}`);
  }

  return mime;
};

module.exports = {
  copy,
  mimeToExt,
  mimeType,
  transcode,
};
