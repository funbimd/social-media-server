/**
 * Get pagination info for query results
 * @param {Object} req - Express request object
 * @param {number} total - Total number of records
 * @returns {Object} Pagination object with limit, page, pages, etc.
 */
exports.getPaginationInfo = (req, total) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const pagination = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  return {
    pagination,
    startIndex,
    limit,
  };
};

/**
 * Apply pagination to a Mongoose query
 * @param {Object} query - Mongoose query object
 * @param {Object} req - Express request object
 * @param {number} total - Total count of documents
 * @returns {Object} Object with query and pagination info
 */
exports.paginateQuery = async (query, req, total) => {
  const { pagination, startIndex, limit } = exports.getPaginationInfo(
    req,
    total
  );

  const paginatedQuery = query.skip(startIndex).limit(limit);

  return {
    query: paginatedQuery,
    pagination,
  };
};
