const probe = require('../cli/probe');

// [webm @ 0x5b58e2446340] Only VP8 or VP9 or AV1 video and Vorbis or Opus audio
// and WebVTT subtitles are supported for WebM.
const isWebm = (format) => /webm/iu.test(format);
const isMp4 = (format) => /mp4/iu.test(format);
const isVorbis = (codec) => /vorbis/iu.test(codec);
const isOpus = (codec) => /opus/iu.test(codec);
const isVP8 = (codec) => /vp8/iu.test(codec);
const isVP9 = (codec) => /vp9/iu.test(codec);
const isAV1 = (codec) => /av1/iu.test(codec);

const audioCopyOptions = async (path, streamIndex) => {
  const { audios, format } = await probe(path);

  let codecOptions = '-c copy -f mp4';
  let extension = 'm4a';
  let mime = 'audio/mp4';

  if (isWebm(format)) {
    console.log(path, streamIndex);
    const { codec } = audios.find(({ index }) => index === streamIndex);
    if (isVorbis(codec) || isOpus(codec)) {
      codecOptions = '-c copy -f webm';
      extension = 'webm';
      mime = `audio/${codec}`;
    } else {
      // probably fails to decode, redirect to /transcode ?
      console.warn('Unsupported audio ?', format, codec);
    }
  } else if (isMp4(format)) {
    codecOptions = '-c copy -f mp4';
    extension = 'm4a';
    mime = 'audio/mp4';
  } else {
    // probably fails to decode, redirect to /transcode ?
    console.warn('Unsupported audio ?', format);
  }

  return {
    codecOptions,
    extension,
    mime,
  };
};

const videoCopyOptions = async (path) => {
  const { format, video } = await probe(path);

  let codecOptions = '-c copy -f mp4';
  let extension = 'mp4';
  let mime = 'video/mp4';

  if (isWebm(format)) {
    const { codec } = video;
    if (isVP8(codec) || isVP9(codec) || isAV1(codec)) {
      codecOptions = '-c copy -f webm';
      extension = 'webm';
      mime = `video/${codec}`;
    } else {
      // probably fails to decode, redirect to /transcode ?
      console.warn('Unsupported video ?', format, codec);
    }
  } else if (isMp4(format)) {
    codecOptions = '-c copy -f mp4';
    extension = 'mp4';
    mime = 'video/mp4';
  } else {
    // probably fails to decode, redirect to /transcode ?
    console.warn('Unsupported video ?', format);
  }

  return {
    codecOptions,
    extension,
    mime,
  };
};

const copy = async (type, path, streamIndex) => {
  // console.log(audios, format, video);
  if (type === 'audio') {
    return audioCopyOptions(path, streamIndex);
  }

  if (type === 'subtitle') {
    return {
      codecOptions: '-c copy -f ass',
      extension: 'ass',
      mime: 'text/ass',
    };
  }

  if (type === 'video') {
    return videoCopyOptions(path);
  }

  return null;
};

const transcode = (type) => {
  let codecOptions;
  let extension;
  let mime;

  switch (type) {
    case 'audio':
      codecOptions = '-c:a libmp3lame -f mp3';
      extension = 'mp3';
      mime = 'audio/mp3';
      break;

    case 'subtitle':
      codecOptions = '-f webwtt';
      extension = 'vtt';
      mime = 'text/vtt';
      break;

    case 'video':
      codecOptions = '-c:v h264_nvenc -pix_fmt yuv420p -movflags frag_keyframe+empty_moov -preset slow -f mp4';
      extension = 'mp4';
      mime = 'video/mp4';
      break;

    default:
      throw new Error(`Unknown type: ${type}`);
  }

  return {
    codecOptions,
    extension,
    mime,
  };
};

module.exports = {
  copy,
  transcode,
};
