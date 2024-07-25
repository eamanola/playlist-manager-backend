const exec = require('./exec-promisified.js');
const escapePath = require('../utils/escape-path.js');

const formatStreams = (streams) => {
  const [video] = streams
    .filter(({ codec_type: ct, tags }) => (
      ct === 'video' && !(tags.mimetype || '').startsWith('image')
    ))
    .map(({ index }) => ({ index }));

  const audios = streams
    .filter(({ codec_type: ct }) => ct === 'audio')
    .map(({ index, tags }) => ({ index, language: tags.language }));

  const subtitles = streams
    .filter(({ codec_type: ct }) => ct === 'subtitle')
    .map(({ index, tags }) => ({ index, language: tags.language, title: tags.title }));

  return { audios, subtitles, video };
};

const formatChapters = (chapters) => chapters.map((chapter) => ({
  end: Number(chapter.end_time),
  start: Number(chapter.start_time),
  title: chapter.tags.title,
}));

const formatContainer = (container) => ({
  duration: Number(container.duration),
  format: container.format_name,
});

const format = (stdout) => {
  // console.log(stdout);

  const { streams, chapters, format: container } = JSON.parse(stdout);

  return {
    ...formatStreams(streams),
    chapters: formatChapters(chapters),
    ...formatContainer(container),
  };
};

const probe = async (filePath) => {
  const cmd = [
    'ffprobe',
    '-v error',
    '-show_entries',
    [
      'stream=codec_type,index',
      'stream_tags=mimetype,filename,language,title',
      'format=format_name,duration',
      'chapter=start_time,end_time',
      'chapter_tags=title',
    ].join(':'),
    '-print_format json',
    `-i "${escapePath(filePath)}"`,
  ].join(' ');

  const { stdout } = await exec(cmd);

  return format(stdout);
};

module.exports = probe;
