// const express = require('express');
const router = () => (req, res/* , next */) => {
  const { query } = req;
  const { q } = query;

  const searchQueries = (Array.isArray(q) ? q : [q])
    .map((aQuery) => decodeURIComponent(aQuery));

  res.status(200).json(searchQueries.map((aQuery) => ({ q: aQuery })));
};

module.exports = { router };
