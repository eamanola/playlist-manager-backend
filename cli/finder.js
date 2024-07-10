const { readdir } = require('node:fs/promises');

const filterExtensions = (extentions) => ({ name }) => extentions
  .includes(name.split('.').pop().toLowerCase());

const filterFolders = (file) => file.isFile();

const removeUnnecessary = ({ name, path }) => ({ name, path });

const finder = async (path, { extentions = [] } = {}) => {
  const files = await readdir(path, { recursive: true, withFileTypes: true });

  const filtered = (
    extentions.length === 0
      ? [...files] : files.filter(filterExtensions(extentions))
  )
    .filter(filterFolders);

  const cleaned = filtered.map(removeUnnecessary);

  return cleaned;
};

module.exports = finder;
