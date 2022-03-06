const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const studentsSchema = new Schema({
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
    required: true,
  },
  sId: {
    type: String,
    required: true,
  },
  tutorId: {
    type: String,
    required: true,
  },
  sClass: {
    type: String,
    required: true,
  },
  sDivision: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
  },
  address: {
    type: String,
  },
  photo: {
    type: String,
  },
  attendance: [
    {
      date: String,
      present: Boolean,
      lastUpdated: String,
    },
  ],
  assignments: [
    {
      topic: String,
      content: String,
      date: String,
      file: String,
      filetype: String,
      studentId: String,
      mark: String,
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
      modifiedAt: String,
    },
  ],
  chat: [
    {
      date: String,
      message: String,
      chatType: String,
      voiceUrl: String,
      voiceType: String
    },
  ],
})


module.exports = mongoose.model('Student', studentsSchema);