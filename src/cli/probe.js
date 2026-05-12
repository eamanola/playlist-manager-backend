const exec = require('./exec-promisified');
const escapePath = require('../utils/escape-path');

const formatStreams = (streams) => {
  const [video] = streams
    .filter(({ codec_type: ct, tags }) => ct === 'video' && !/image/u.test(tags?.mimetype))
    .map(({ index, codec_name: codec }) => ({ codec, index }));

  const audios = streams
    .filter(({ codec_type: ct }) => ct === 'audio')
    .map(({ index, codec_name: codec, tags }) => ({
      codec, index, language: tags?.language || 'und',
    }));

  const subtitles = streams
    .filter(({ codec_type: ct }) => ct === 'subtitle')
    .map(({ index, tags, codec_name: codec }) => ({
      codec, index, language: tags?.language, title: tags?.title,
    }));

  const fonts = streams
    .filter(({ codec_type: ct, tags }) => ct === 'attachment' && /font/u.test(tags?.mimetype))
    .map(({ tags }) => ({ filename: tags?.filename, mimetype: tags?.mimetype }));

  return {
    audios, fonts, subtitles, video,
  };
};

const formatChapters = (chapters) => chapters.map((chapter) => ({
  end: Number(chapter.end_time),
  start: Number(chapter.start_time),
  title: chapter.tags?.title,
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
      'stream=codec_type,index,codec_name',
      'stream_tags=mimetype,filename,language,title',
      'format=format_name,duration',
      'chapter=start_time,end_time',
      'chapter_tags=title',
    ].join(':'),
    '-print_format json',
    `-i "${escapePath(filePath)}"`,
  ].join(' ');

  // console.log(cmd);
  const { stdout } = await exec(cmd);

  return format(stdout);
};

module.exports = probe;
