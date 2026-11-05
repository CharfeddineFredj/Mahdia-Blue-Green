const Post = require('../models/Post');
const Counter = require('../models/Counter');

const COUNTER_ID = 'event';

/**
 * Backfill eventNumber for legacy events, sync Counter, then return next integer id.
 */
async function getNextEventNumber() {
  const maxDoc = await Post.findOne({
    type: 'event',
    eventNumber: { $exists: true, $ne: null },
  })
    .sort({ eventNumber: -1 })
    .select('eventNumber')
    .lean();

  const missing = await Post.find({
    type: 'event',
    $or: [{ eventNumber: { $exists: false } }, { eventNumber: null }],
  })
    .sort({ createdAt: 1 })
    .select('_id');

  let next = (maxDoc?.eventNumber || 0) + 1;
  for (const doc of missing) {
    await Post.updateOne({ _id: doc._id }, { $set: { eventNumber: next } });
    next += 1;
  }

  const newMaxDoc = await Post.findOne({
    type: 'event',
    eventNumber: { $exists: true, $ne: null },
  })
    .sort({ eventNumber: -1 })
    .select('eventNumber')
    .lean();
  const newMax = newMaxDoc?.eventNumber || 0;

  await Counter.findOneAndUpdate(
    { _id: COUNTER_ID },
    { $set: { seq: newMax } },
    { upsert: true }
  );

  const doc = await Counter.findOneAndUpdate(
    { _id: COUNTER_ID },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

module.exports = { getNextEventNumber };
