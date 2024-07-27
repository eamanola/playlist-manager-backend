const codecOptions = (type, transcode) => {
  if (!transcode) {
    return '-c copy -f mp4';
  }

  if (type === 'audio') {
    return '-c:a libmp3lame -f mp3';
  }

  return '-c:v h264_nvenc -pix_fmt yuv420p -movflags frag_keyframe+empty_moov -f mp4';
};

const extension = (type, transcode) => {
  if (type === 'audio') {
    return transcode ? 'mp3' : 'm4a';
  }

  return 'mp4';
};

const mime = (type, transcode) => {
  if (type === 'audio') {
    return transcode ? 'audio/mp3' : 'audio/mp4';
  }

  return 'video/mp4';
};

module.exports = {
  codecOptions,
  extension,
  mime,
};
