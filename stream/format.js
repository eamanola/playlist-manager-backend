const codecOptions = (type, transcode) => {
  if (type === 'audio') {
    return transcode ? '-c:a libmp3lame -f mp3' : '-c copy -f mp4';
  }

  if (type === 'subtitle') {
    return transcode ? '-f webwtt' : '-c copy -f ass';
  }

  if (type === 'video') {
    return transcode
      ? '-c:v h264_nvenc -pix_fmt yuv420p -movflags frag_keyframe+empty_moov -f mp4'
      // TODO: webm ?
      : '-c copy -f mp4';
  }

  return null;
};

const extension = (type, transcode) => {
  if (type === 'audio') {
    return transcode ? 'mp3' : 'm4a';
  }

  if (type === 'subtitle') {
    return transcode ? 'vtt' : 'ass';
  }

  if (type === 'video') {
    return 'mp4';
  }

  return null;
};

const mime = (type, transcode) => {
  if (type === 'audio') {
    return transcode ? 'audio/mp3' : 'audio/mp4';
  }

  if (type === 'subtitle') {
    return transcode ? 'text/vtt' : 'text/ass';
  }

  if (type === 'video') {
    return 'video/mp4';
  }

  return null;
};

module.exports = {
  codecOptions,
  extension,
  mime,
};
