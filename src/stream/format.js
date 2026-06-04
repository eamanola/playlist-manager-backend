const { utils } = require('automata-utils');

const { createNotSupported } = require('../errors');
const escapePath = require('../utils/escape-path');
const exec = require('../cli/exec-promisified');

const { logger } = utils;
// [webm @ 0x5b58e2446340] Only VP8 or VP9 or AV1 video and Vorbis or Opus audio
// and WebVTT subtitles are supported for WebM.
// https://support.mozilla.org/en-US/kb/audio-and-video-firefox#w_audio-codecs
const isWebm = (format) => /webm/iu.test(format);
const isMp4 = (format) => /mp4/iu.test(format);
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

// stream are container based, not type
const streamProbe = async (filePath, streamIndex) => {
  const cmd = [
    'ffprobe',
    '-v error',
    `-i "${escapePath(filePath)}"`,
    '-show_entries stream=codec_type,codec_name:format=format_name',
    `-select_streams ${streamIndex}`,
    '-print_format json',
  ].join(' ');

  console.log(cmd);
  const { stdout } = await exec(cmd);

  console.log(stdout);
  const results = JSON.parse(stdout);

  const { codec_type: type, codec_name: codec } = results?.streams[0] || {};
  const { format_name: format } = results?.format || {};

  return { codec, format, type };
};

const audioMime = (format, codec = null) => {
  if (isMp4(format)) return 'audio/mp4';

  if (isMp3(format)) return 'audio/mp3';

  if (isWebm(format)) return 'audio/webm';

  if (isOpus(format)) return 'audio/ogg';

  if (codec) return `audio/${codec}`;

  return 'audio/*';
};

const videoMime = (format, codec = null) => {
  if (isMp4(format)) return 'video/mp4';

  if (isWebm(format)) return 'video/webm';

  if (codec) return `video/${codec}`;

  return 'video/*';
};

const subtitleMime = (codec) => {
  if (isAss(codec)) return 'text/ass';

  if (isWebVTT(codec)) return 'text/vtt';

  return 'subtitles/*';
};

const audioCopyOptions = async (path, streamIndex) => {
  const { codec, format } = await streamProbe(path, streamIndex);

  let codecOptions;
  let mime;

  if (isMp3(codec)) {
    codecOptions = '-c:a copy -f mp3';
    mime = audioMime('mp3');
  } else if (isAc3(codec)) {
    throw createNotSupported({ codec });
  } else if (isVorbis(codec) || isOpus(codec)) {
    codecOptions = '-c:a copy -f webm';
    mime = audioMime('webm');
  } else if (isMp4(format) || isAAC(codec)) {
    codecOptions = '-c:a copy -f mp4';
    mime = audioMime('mp4');
  } else {
    logger.warn('defaulting audio to MP4', codec, format);

    codecOptions = '-c:a copy -f mp4';
    mime = audioMime('mp4');
  }

  return {
    codecOptions,
    mime,
  };
};

const videoCopyOptions = async (path, streamIndex) => {
  const { codec, format } = await streamProbe(path, streamIndex);

  let codecOptions;
  let mime;

  // hevc:
  // (In some cases? limited support according to mdc)
  // Firefox is capable to decode,
  // but takes much longer than full transcode
  if (isHevc(codec) || isMSMpeg4v2(codec)) {
    throw createNotSupported({ codec });
  } if (isVP8(codec) || isVP9(codec) || isAV1(codec)) {
    codecOptions = '-c:v copy -f webm';
    mime = videoMime('webm', codec);
  } else if (isMp4(format) || isH264(codec)) {
    codecOptions = '-c:v copy -f mp4';
    mime = videoMime('mp4');
  } else {
    logger.warn('defaulting video to MP4', codec, format);

    codecOptions = '-c:v copy -f mp4';
    mime = videoMime('mp4');
  }

  return {
    codecOptions,
    mime,
  };
};

const subTitleCopyOptions = async (path, streamIndex) => {
  const { codec } = await streamProbe(path, streamIndex);

  let codecOptions;
  let mime;

  if (isWebVTT(codec)) {
    codecOptions = '-c:s copy -f webvtt';
    mime = subtitleMime(codec);
  } else if (isAss(codec)) {
    codecOptions = '-c:s copy -f ass';
    mime = subtitleMime(codec);
  } else {
    console.warn('defaulting to ass', codec);

    codecOptions = '-c:s copy -f ass';
    mime = subtitleMime('ass');
  }

  return {
    codecOptions,
    mime,
  };
};

const copyOptions = async (type, path, streamIndex) => {
  if (type === 'audio') {
    return audioCopyOptions(path, streamIndex);
  }

  if (type === 'subtitle') {
    return subTitleCopyOptions(path, streamIndex);
  }

  if (type === 'video') {
    return videoCopyOptions(path, streamIndex);
  }

  return null;
};

const transcodeOptions = (type) => {
  let codecOptions;
  let mime;

  switch (type) {
    case 'audio':
      codecOptions = '-c:a libopus -ac 2 -f opus';
      mime = audioMime('opus');
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

// const mimeType = async (type, path) => {
//   const ANY_STREAM = 0;
//   const { format } = await streamProbe(path, ANY_STREAM);

//   let mime;
//   switch (type) {
//     case 'audio':
//       mime = audioMime(format);
//       break;

//     case 'subtitle':
//       mime = subtitleMime(format);
//       break;

//     case 'video':
//       mime = videoMime(format);
//       break;

//     default:
//       throw new Error(`Unknown type: ${type}`);
//   }

//   return mime;
// };

module.exports = {
  copyOptions,
  // mimeType,
  transcodeOptions,
};
