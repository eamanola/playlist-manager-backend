const { utils } = require('automata-utils');

const probe = require('../cli/probe');

const { logger } = utils;

// [webm @ 0x5b58e2446340] Only VP8 or VP9 or AV1 video and Vorbis or Opus audio
// and WebVTT subtitles are supported for WebM.
const isWebm = (format) => /webm/iu.test(format);
const isMp4 = (format) => /mp4/iu.test(format);
const isMp3 = (format) => /mp3/iu.test(format);
const isWebVTT = (format) => /webvtt/iu.test(format);
const isAss = (format) => /ass/iu.test(format);
const isVorbis = (codec) => /vorbis/iu.test(codec);
const isOpus = (codec) => /opus/iu.test(codec);
const isVP8 = (codec) => /vp8/iu.test(codec);
const isVP9 = (codec) => /vp9/iu.test(codec);
const isAV1 = (codec) => /av1/iu.test(codec);

const SKIP_WARNING = [
  { codec: 'aac', format: 'matroska,webm' }, // container swap ok
  { codec: 'flac', format: 'matroska,webm' }, // container swap ok
  { codec: 'h264', format: 'matroska,webm' }, // container swap ok
  // { format: 'matroska,webm', codec: 'hevc' }, // Fail
];

const skipWarning = (format, codec) => SKIP_WARNING.find(
  ({ codec: c, format: f }) => c === codec && f === format,
);

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

  let codecOptions = '-c copy -f mp4';
  let mime = audioMime('mp4');

  if (isWebm(format)) {
    const { codec } = audios.find(({ index }) => index === streamIndex);

    if (isVorbis(codec) || isOpus(codec)) {
      codecOptions = '-c copy -f webm';
      mime = audioMime('webm', codec);
    } else if (!skipWarning(format, codec)) {
      // probably fails to decode, redirect to /transcode ?
      logger.warn('Unsupported audio ?', format, codec);
    }
  } else if (isMp4(format)) {
    codecOptions = '-c copy -f mp4';
    mime = audioMime('mp4');
  } else {
    // probably fails to decode, redirect to /transcode ?
    logger.error('Unsupported audio ?', format);
  }

  return {
    codecOptions,
    mime,
  };
};

const videoCopyOptions = async (path) => {
  const { format, video } = await probe(path);

  let codecOptions = '-c copy -f mp4';
  let mime = videoMime('mp4');

  if (isWebm(format)) {
    const { codec } = video;

    if (isVP8(codec) || isVP9(codec) || isAV1(codec)) {
      codecOptions = '-c copy -f webm';
      mime = videoMime('webm', codec); // video/webm?
    } else if (!skipWarning(format, codec)) {
      // probably fails to decode, redirect to /transcode ?
      logger.warn('Unsupported video ?', format, codec);
    }
  } else if (isMp4(format)) {
    codecOptions = '-c copy -f mp4';
    mime = videoMime('mp4');
  } else {
    // probably fails to decode, redirect to /transcode ?
    logger.warn('Unsupported video ?', format);
  }

  return {
    codecOptions,
    mime,
  };
};

const copy = async (type, path, streamIndex) => {
  // console.log(audios, format, video);
  if (type === 'audio') {
    return audioCopyOptions(path, streamIndex);
  }

  if (type === 'subtitle') {
    const mime = subtitleMime('ass');

    return {
      codecOptions: '-c copy -f ass',
      mime,
    };
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
      codecOptions = '-f webwtt';
      mime = subtitleMime('webwtt');
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
