const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const tutorSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  job: {
    type: String,
  },
  tClass: {
    type: String,
  },
  tDivision: {
    type: String,
  },
  tEmail: {
    type: String,
  },
  address: {
    type: String,
  },
  mobile: {
    type: String,
  },
  photo: {
    type: String,
  },
  assignments: [
    {
      topic: String,
      content: String,
      date: String,
      file: String,
      filetype: String,
      tutorId: String,
      item: String,
    },
  ],
  notes: [
    {
      topic: String,
      date: String,
      file: String,
      link: String,
      filetype: String,
      filename: String,
      tutorId: String,
      item: String,
    },
  ],
  announcements: [
    {
      message: String,
      description: String,
      date: String,
      file: String,
      filetype: String,
      filename: String,
    },
  ],
  events: [
    {
      eventHead: String,
      eventBy: String,
      topic: String,
      date: String,
      file: String,
      filetype: String,
      filename: String,
      paidEvent: Boolean,
      eventPrice: String,
      eventAccess: Boolean,
      updatedAt: String,
    },
  ],
  images: [
    {
      name: String,
      imageUrl: String,
      date: String,
      tutorId: String,
    },
  ],
  attendance: [
    {
      date: String,
      totalDays: String,
    },
  ],
  chat: [
    {
      date: String,
      time: String,
      message: String,
      sId: String,
      voiceUrl: String,
      voiceType: String,
      videoId: Boolean
    },
  ],
})


module.exports = mongoose.model('Tutor', tutorSchema);