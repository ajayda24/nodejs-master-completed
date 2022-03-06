const fs = require('fs')
const path = require('path')

const deletFiles = require('../util/deleteFiles')
const io = require('../socket')
const sIo = require('socket.io')

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
var unirest = require('unirest')
var canvas = require('canvas')
var Clipper = require('image-clipper')
var Razorpay = require('razorpay')
const { validationResult } = require('express-validator')
const { uuid } = require('uuidv4')

const checksum_lib = require('../paytm/checksum')
const config = require('../paytm/config')

var PaytmChucksum = require('../paytm/chucksumOfficial')


var instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const paypal = require('paypal-rest-sdk')

paypal.configure({
  mode: 'sandbox', //sandbox or live
  client_id: process.env.PAYPAL_CONFIGURE_CLIENT_ID,
  client_secret: process.env.PAYPAL_CONFIGURE_CLIENT_SECRET,
})

const Tutor = require('../models/tutor')
const Student = require('../models/student')
const tutor = require('../models/tutor')

exports.getIndex = (req, res, next) => {
  const tutorId = req.session.tutor._id.toString()
  const folderName = 'tutorFiles/' + tutorId
  try {
    if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName)
    }
  } catch (err) {
    console.log(err);
    // const error = new Error(err)
    // error.httpStatusCode = 500
    // return next(error)
  }

  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    const lastAnn = tutor.announcements.slice(
      Math.max(tutor.announcements.length - 5, 0)
    )
    const lastAnnSort = lastAnn.reverse();
    const lastevents = tutor.events.slice(Math.max(tutor.events.length - 5, 0));
    const lastEventsSort = lastevents.reverse();

    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments)
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()

        

      res.render('tutor/index', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        announcements: lastAnnSort,
        events: lastEventsSort,
        notifyAssignments: studentAssignments,
      })
    })
  })
}

exports.getProfile = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    res.render('tutor/profile', {
      pageTitle: 'Dashboard',
      path: '/tutor',
      sPath: '/tutor/profile',
      tutorId: tutor._id,
      name: tutor.name,
      editing: false,
      isAuthenticated: req.session.isTutorLoggedIn,
      job: tutor.job,
      tClass: tutor.tClass,
      division: tutor.tDivision,
      tEmail: tutor.tEmail,
      address: tutor.address,
      mobile: tutor.mobile,
      photo: tutor.photo,
      notifyAssignments: studentAssignments,
    })
  })
})
}

exports.getEditProfile = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    const editMode = req.query.edit
    if (!editMode) {
      return res.redirect('/')
    }
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    const tutorId = req.params.tutorId
    Tutor.findById(tutorId)
      .then((tutor) => {
        if (!tutor) {
          return res.redirect('/tutor')
        }
        res.render('tutor/profile-edit', {
          pageTitle: 'Edit Profile',
          path: '/tutor',
          sPath: '/tutor/profile',
          name: tutor.name,
          editing: editMode,
          isAuthenticated: req.session.isTutorLoggedIn,
          tutor: tutor,
          notifyAssignments: studentAssignments,
        })
      })
      .catch((err) => console.log(err))
  })
})
}

exports.postEditProfile = (req, res, next) => {
  const tutorId = req.body.tutorId

  const updatedName = req.body.inputName
  const updatedEmail = req.body.inputEmail
  const updatedClass = req.body.inputClass
  const updatedDivision = req.body.inputDivision
  const updatedMobile = req.body.inputMobile
  const updatedAddress = req.body.inputAddress

  const file = req.file
  if (file) {
    var fileUrl = file.path
    var fileType = file.mimetype
  }

  Tutor.findById(tutorId)
    .then((profile) => {
      profile.name = updatedName
      profile.tEmail = updatedEmail
      profile.tClass = updatedClass
      profile.tDivision = updatedDivision
      profile.mobile = updatedMobile
      profile.address = updatedAddress

      if (file) {
        if (fs.existsSync(profile.photo)) {
          deletFiles.deleteFile(profile.photo, next)
        }
        profile.photo = fileUrl
      }
      return profile.save()
    })
    .then((result) => {
      console.log('UPDATED PROFILE!')
      res.redirect('/tutor/profile')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getStudents = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
      res.render('tutor/students', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor/students',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        students: students,
        notifyAssignments: studentAssignments,
      })
    })
  })
}

exports.getDetailsStudent = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    const studentId = req.params.studentId
    Student.findById(studentId).then((student) => {
      res.render('tutor/student-details', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor/students',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        student: student,
        assignments: student.assignments,
        notifyAssignments: studentAssignments,
      })
    })
  })
})
}

exports.getAddStudents = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    res.render('tutor/students-add', {
      pageTitle: 'Dashboard',
      path: '/tutor',
      sPath: '/tutor/students',
      name: tutor.name,
      editing: false,
      isAuthenticated: req.session.isTutorLoggedIn,
      tutor: tutor,
      notifyAssignments: studentAssignments,
    })
  })
})
}

exports.postAddStudents = (req, res, next) => {
  const addedName = req.body.inputName
  const addedEmail = req.body.inputEmail
  const addedPassword = req.body.inputPassword
  const addedClass = req.body.inputClass
  const addedDivision = req.body.inputDivision
  const addedRollNo = req.body.inputRollNo
  const addedMobile = req.body.inputMobile
  const addedAddress = req.body.inputAddress

  const sampleImage = req.body.sampleImage
  const file = req.file
  if (file) {
    fileUrl = file.path
  } else {
    fileUrl = sampleImage
  }

  bcrypt.hash(addedPassword, 12).then((hashedPassword) => {
    const newStudent = new Student({
      email: addedEmail,
      password: hashedPassword,
      name: addedName,
      sId: addedRollNo,
      tutorId: req.session.tutor._id,
      sClass: addedClass,
      sDivision: addedDivision,
      mobile: addedMobile,
      address: addedAddress,
      photo: fileUrl,
    })
    newStudent
      .save()
      .then((result) => {
        // console.log(result);
        console.log('Added New Student')
        res.redirect('/tutor/students')
      })
      .catch((err) => {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
      })
  })
}

exports.getEditStudent = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    const editMode = req.query.edit
    if (!editMode) {
      return res.redirect('/')
    }
    const studentId = req.params.studentId
    Student.findById(studentId)
      .then((student) => {
        if (!student) {
          return res.redirect('/tutor/students')
        }
        res.render('tutor/student-edit', {
          pageTitle: 'Edit Student',
          path: '/tutor',
          sPath: '/tutor/students',
          name: tutor.name,
          editing: editMode,
          isAuthenticated: req.session.isTutorLoggedIn,
          tutor: tutor,
          student: student,
          notifyAssignments: studentAssignments,
        })
      })
      .catch((err) => {
        const error = new Error(err)
        error.httpStatusCode = 500
        return next(error)
      })
  })
})
}

exports.postEditStudents = (req, res, next) => {
  const studentId = req.body.studentId

  const updatedName = req.body.inputName
  const updatedEmail = req.body.inputEmail
  const updatedPassword = req.body.inputPassword
  const updatedClass = req.body.inputClass
  const updatedDivision = req.body.inputDivision
  const updatedRollNo = req.body.inputRollNo
  const updatedMobile = req.body.inputMobile
  const updatedAddress = req.body.inputAddress
  const file = req.file
  if (file) {
    var fileUrl = file.path
  }

  Student.findById(studentId).then((details) => {
    if (!updatedPassword == '') {
      bcrypt.hash(updatedPassword, 12).then((hashedPassword) => {
        details.email = updatedEmail
        details.password = hashedPassword
        details.name = updatedName
        details.sId = updatedRollNo
        details.tutorId = req.session.tutor._id
        details.sClass = updatedClass
        details.sDivision = updatedDivision
        details.mobile = updatedMobile
        details.address = updatedAddress
        if (file) {
          details.photo = fileUrl
        }
        details
          .save()
          .then((result) => {
            // console.log(result);
            console.log('Edited a Student')
            res.redirect('/tutor/students')
          })
          .catch((err) => {
            console.log(err)
          })
      })
    } else {
      details.email = updatedEmail
      details.name = updatedName
      details.sId = updatedRollNo
      details.tutorId = req.session.tutor._id
      details.sClass = updatedClass
      details.sDivision = updatedDivision
      details.mobile = updatedMobile
      details.address = updatedAddress
      if (file) {
        details.photo = fileUrl
      }
      details
        .save()
        .then((result) => {
          // console.log(result);
          console.log('Edited a Student')
          res.redirect('/tutor/students')
        })
        .catch((err) => {
          const error = new Error(err)
          error.httpStatusCode = 500
          return next(error)
        })
    }
  })
}

exports.postDeleteStudents = (req, res, next) => {
  const studentId = req.body.studentId
  Student.findById(studentId)
    .then((student) => {
      if (
        student.photo !=
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcREXkCmHkZReqX244oe5PqHs7Xx87MdHEbbfA&usqp=CAU'
      ) {
        if (fs.existsSync(student.photo)) {
          deletFiles.deleteFile(student.photo, next)
        }
      }
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
  Student.findByIdAndRemove(studentId)
    .then(() => {
      res.redirect('/tutor/students')
    })
    .catch((err) => console.log(err))
}

exports.getAttendance = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var today = new Date().toLocaleDateString()
      var date = new Date(today)
      var dd = String(date.getDate()).padStart(2, '0')
      var mm = String(date.getMonth() + 1).padStart(2, '0') //January is 0!
      var yyyy = date.getFullYear()

      today = yyyy + '-' + mm + '-' + dd

      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      

      res.render('tutor/attendance', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor/attendance',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        students: students,
        initialDate: today,
        notifyAssignments: studentAssignments,
      })
    })
  })
}

exports.postSearchAttendance = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
      var searchDate = req.body.date
      res.render('tutor/attendance', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor/attendance',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        students: students,
        initialDate: searchDate,
        notifyAssignments: studentAssignments,
      })
    })
  })
}

exports.getSingleStudentAttendance = (req, res, next) => {
  const studentId = req.params.studentId
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    Student.findById({ _id: studentId }, function (err, student) {
      res.render('tutor/attendance-single', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor/attendance',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        attendance: student.attendance,
        student: student,
        notifyAssignments: studentAssignments,
      })
    })
  })
})
}

exports.getAssignments = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    res.render('tutor/assignments', {
      pageTitle: 'Dashboard',
      path: '/tutor',
      sPath: '/tutor/assignments',
      name: tutor.name,
      editing: false,
      isAuthenticated: req.session.isTutorLoggedIn,
      assignments: tutor.assignments,
      notifyAssignments: studentAssignments,
    })
  })
})
}

exports.postAddAssignments = (req, res, next) => {
  const tutorId = req.session.tutor._id
  const topic = req.body.inputTopic
  const questions = req.body.inputQuestions
  const file = req.file
  if (file) {
    var fileUrl = file.path
    var fileType = file.mimetype
  }

  const date = new Date().toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  Tutor.findOne({ _id: req.session.tutor._id })
    .then((tutor) => {
      var addAssignments = {}
      if (file) {
        addAssignments = {
          topic: topic,
          content: questions,
          date: date,
          file: fileUrl,
          filetype: fileType,
          tutorId: tutorId,
          item: 'Assignment'
        }
      } else {
        addAssignments = {
          topic: topic,
          content: questions,
          date: date,
          file: fileUrl,
          filetype: fileType,
          tutorId: tutorId,
          item: 'Assignment',
        }
      }
      
      tutor.assignments.push(addAssignments)
      return tutor.save()
    })
    .then((tutor) => {
      io.getIO().emit('notifications', {
        action: 'assignment-adding',
        data: tutor.assignments,
      })
      res.redirect('/tutor/assignments')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getAssignmentsDetails = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    const studentId = req.params.studentId
    if (studentId) {
      Student.findOne({ _id: studentId }, function (err, student) {
        const assignmentId = req.params.assignmentId
        const studentAssignment = student.assignments.find(
          ({ _id }) => _id == assignmentId
        )

        if (studentAssignment.filetype == 'application/pdf') {
          const assignmentRead = studentAssignment.file
          const file = fs.createReadStream(assignmentRead)
          res.setHeader('Content-Type', 'application/pdf')
          file.pipe(res)
        } else {
          res.render('tutor/assignments-details', {
            pageTitle: 'Dashboard',
            path: '/tutor',
            sPath: '/tutor/assignments',
            name: tutor.name,
            editing: false,
            isAuthenticated: req.session.isTutorLoggedIn,
            assignment: studentAssignment,
            notifyAssignments: studentAssignments,
          })
        }
      })
    } else {
      const assignmentId = req.params.assignmentId
      const tutorAssignment = tutor.assignments.find(
        ({ _id }) => _id == assignmentId
      )

      if (tutorAssignment.filetype == 'application/pdf') {
        const assignmentRead = tutorAssignment.file
        const file = fs.createReadStream(assignmentRead)
        res.setHeader('Content-Type', 'application/pdf')
        file.pipe(res)
      } else {
        res.render('tutor/assignments-details', {
          pageTitle: 'Dashboard',
          path: '/tutor',
          sPath: '/tutor/assignments',
          name: tutor.name,
          editing: false,
          isAuthenticated: req.session.isTutorLoggedIn,
          assignment: tutorAssignment,
          notifyAssignments: studentAssignments,
        })
      }
    }
  })
})
}

exports.postStudentAssignmentMark = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    var studentId = req.params.studentId
    const assignmentMark = req.body.assignmentMark
    if (studentId) {
      Student.findOne({ _id: studentId }).then((student) => {
        const assignmentId = req.params.assignmentId
        const studentAssignment = student.assignments.find(
          ({ _id }) => _id == assignmentId
        )
        studentAssignment.mark = assignmentMark
        student.save().then((result) => {
          res.redirect('/tutor/students/details/' + studentId)
        })
      })
    }
  })
}

exports.postDeleteAssignments = (req, res, next) => {
  const assignmentId = req.body.assignmentId
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    const assignment = tutor.assignments.find(({ _id }) => _id == assignmentId)
    if (fs.existsSync(assignment.file)) {
      deletFiles.deleteFile(assignment.file, next)
    }
  })
  Tutor.findByIdAndUpdate(req.session.tutor._id, {
    $pull: { assignments: { _id: assignmentId } },
  })
    .then((tutor) => {
      io.getIO().emit('notifications', {
        action: 'assignment-deleting',
        data: tutor.assignments,
      })
      res.redirect('/tutor/assignments')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getNotes = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    res.render('tutor/notes', {
      pageTitle: 'Dashboard',
      path: '/tutor',
      sPath: '/tutor/notes',
      name: tutor.name,
      editing: false,
      isAuthenticated: req.session.isTutorLoggedIn,
      notes: tutor.notes,
      notifyAssignments: studentAssignments,
    })
  })
})
}

exports.postAddNotes = (req, res, next) => {
  const tutorId = req.session.tutor._id
  const topic = req.body.inputTopic
  const videoLink = req.body.inputYoutubeLink
  const file = req.file
  if (file) {
    var notesFileUrl = file.path
    var notesFileType = file.mimetype
    var notesFileOriginalName = file.originalname
  }
  if (videoLink) {
    var video_id = videoLink
    var search_v = videoLink.search('v=')
    var searchYoutu = video_id.search('youtu.be')
    if (search_v != -1) {
      video_id = videoLink.split('v=')[1]
      var ampersandPosition = video_id.indexOf('&')
      if (ampersandPosition != -1) {
        video_id = video_id.substring(0, ampersandPosition)
      }
      originalLink = 'https://www.youtube.com/embed/' + video_id
    } else if (searchYoutu != -1) {
      video_id = video_id.substring(17)
      originalLink = 'https://www.youtube.com/embed/' + video_id
    } else {
      originalLink = videoLink
    }
  }
  const date = new Date().toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  Tutor.findOne({ _id: req.session.tutor._id })
    .then((tutor) => {
      var addNotes = {}
      if (file) {
        addNotes = {
          topic: topic,
          date: date,
          file: notesFileUrl,
          filetype: notesFileType,
          filename: notesFileOriginalName,
          tutorId: tutorId,
          item: 'Notes',
        }
      } else if (videoLink) {
        addNotes = {
          topic: topic,
          date: date,
          tutorId: tutorId,
          link: originalLink,
          filename: 'Youtube Video',
          item: 'Notes',
        }
      } else {
        addNotes = {
          topic: topic,
          date: date,
          tutorId: tutorId,
          filename: 'Sample',
          item: 'Notes',
        }
      }

      tutor.notes.push(addNotes)
      return tutor.save()
    })
    .then((tutor) => {
      io.getIO().emit('notifications', {
        action: 'notes-adding',
        data: tutor.notes,
      })
      res.redirect('/tutor/notes')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getNotesDetails = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    const notesId = req.params.notesId
    const note = tutor.notes.find(({ _id }) => _id == notesId)
    if (note.filetype == 'application/pdf') {
      const noteRead = note.file
      const file = fs.createReadStream(noteRead)
      res.setHeader('Content-Type', 'application/pdf')
      file.pipe(res)
    } else if (
      note.filetype == 'video/mp4' ||
      note.filetype == 'video/mkv' ||
      note.filetype == 'video/avi'
    ) {
      res.render('tutor/notes-details', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor/notes',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        note: note,
        video: true,
        notifyAssignments: studentAssignments,
      })
    } else {
      res.render('tutor/notes-details', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor/notes',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        note: note,
        video: false,
        notifyAssignments: studentAssignments,
      })
    }
  })
})
}

exports.postDeleteNotes = (req, res, next) => {
  const noteId = req.body.noteId
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    const note = tutor.notes.find(({ _id }) => _id == noteId)
    if (fs.existsSync(note.file)) {
      deletFiles.deleteFile(note.file, next)
    }
  })
  Tutor.findByIdAndUpdate(req.session.tutor._id, {
    $pull: { notes: { _id: noteId } },
  })
    .then((tutor) => {
      io.getIO().emit('notifications', {
        action: 'notes-deleting',
        data: tutor.notes,
      })
      res.redirect('/tutor/notes')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getAnnouncements = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    res.render('tutor/announcements', {
      pageTitle: 'Dashboard',
      path: '/tutor',
      sPath: '/tutor/announcements',
      name: tutor.name,
      editing: false,
      isAuthenticated: req.session.isTutorLoggedIn,
      announcements: tutor.announcements,
      notifyAssignments: studentAssignments,
    })
  })
})
}

exports.postAddAnnouncements = (req, res, next) => {
  const tutorId = req.session.tutor._id
  const message = req.body.inputMessage
  const description = req.body.inputDescription
  const file = req.file;
  if(file){
    var announcementFileUrl = file.path;
    var announcementFileType = file.mimetype;
    var announcementFileOriginalName = file.originalname;
  }

  const date = new Date().toLocaleDateString()

  Tutor.findOne({ _id: req.session.tutor._id })
    .then((tutor) => {
      var addAnnouncements = {}
      if(file){
        addAnnouncements = {
          message: message,
          description: description,
          date: date,
          file: announcementFileUrl,
          filetype: announcementFileType,
          filename: announcementFileOriginalName,
          tutorId: tutorId,
        }
      } else {
      addAnnouncements = {
        message: message,
        description: description,
        date: date,
        tutorId: tutorId,
      }
      }

      tutor.announcements.push(addAnnouncements)
      return tutor.save()
    })
    .then(() => {
      res.redirect('/tutor/announcements')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getAnnouncementsDetails = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    const announcementId = req.params.announcementId
    const announcement = tutor.announcements.find(
      ({ _id }) => _id == announcementId
    )
    if (announcement){
      if (announcement.filetype == 'application/pdf') {
        const announcementRead = announcement.file
        const file = fs.createReadStream(announcementRead)
        res.setHeader('Content-Type', 'application/pdf')
        file.pipe(res)
      } else if (
        announcement.filetype == 'video/mp4' ||
        announcement.filetype == 'video/mkv' ||
        announcement.filetype == 'video/avi'
      ) {
        res.render('tutor/announcements-details', {
          pageTitle: 'Dashboard',
          path: '/tutor',
          sPath: '/tutor/announcements',
          name: tutor.name,
          editing: false,
          isAuthenticated: req.session.isTutorLoggedIn,
          announcement: announcement,
          video: true,
          notifyAssignments: studentAssignments,
        })
      } else {
        res.render('tutor/announcements-details', {
          pageTitle: 'Dashboard',
          path: '/tutor',
          sPath: '/tutor/announcements',
          name: tutor.name,
          editing: false,
          isAuthenticated: req.session.isTutorLoggedIn,
          announcement: announcement,
          video: false,
          notifyAssignments: studentAssignments,
        })
      }
    } else {
      res.render('tutor/announcements-details', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor/announcements',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        announcement: announcement,
        video: false,
        notifyAssignments: studentAssignments,
      })
    }
  })
})
}

exports.postDeleteAnnouncements = (req, res, next) => {
  const announcementId = req.body.announcementId;

  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    const announcement = tutor.announcements.find(
      ({ _id }) => _id == announcementId
    )
    if (fs.existsSync(announcement.file)) {
      deletFiles.deleteFile(announcement.file, next)
    }
  })

  Tutor.findByIdAndUpdate(req.session.tutor._id, {
    $pull: { announcements: { _id: announcementId } },
  })
    .then(() => {
      res.redirect('/tutor/announcements')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getEvents = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    res.render('tutor/events', {
      pageTitle: 'Dashboard',
      path: '/tutor',
      sPath: '/tutor/events',
      name: tutor.name,
      editing: false,
      isAuthenticated: req.session.isTutorLoggedIn,
      events: tutor.events,
      notifyAssignments: studentAssignments,
    })
  })
})
}

exports.postAddEvents = (req, res, next) => {
  const tutorId = req.session.tutor._id
  const eventHead = req.body.inputEvent
  const eventBy = req.body.inputEventBy
  const topic = req.body.inputTopic
  const paidEvent = req.body.paidEvent
  const eventPrice = req.body.enterPrice

  const date = req.body.inputDate
  const updatedAt = new Date().toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const file = req.file
  if (file) {
    var eventFileUrl = file.path
    var eventFileType = file.mimetype
    var eventFileOriginalName = file.originalname
  }

  Tutor.findOne({ _id: req.session.tutor._id })
    .then((tutor) => {
      var addEvents = {}
      if (paidEvent){
        if (file) {
          addEvents = {
            eventHead: eventHead,
            eventBy: eventBy,
            topic: topic,
            date: date,
            tutorId: tutorId,
            file: eventFileUrl,
            filetype: eventFileType,
            filename: eventFileOriginalName,
            paidEvent: paidEvent,
            eventPrice: eventPrice,
            eventAccess: true,
            updatedAt: updatedAt,
          }
        } else {
          addEvents = {
            eventHead: eventHead,
            eventBy: eventBy,
            topic: topic,
            date: date,
            tutorId: tutorId,
            paidEvent: paidEvent,
            eventPrice: eventPrice,
            eventAccess: true,
            updatedAt: updatedAt,
          }
        }
      } else {
        if (file) {
          addEvents = {
            eventHead: eventHead,
            eventBy: eventBy,
            topic: topic,
            date: date,
            tutorId: tutorId,
            file: eventFileUrl,
            filetype: eventFileType,
            filename: eventFileOriginalName,
            updatedAt: updatedAt,
          }
        } else {
          addEvents = {
            eventHead: eventHead,
            eventBy: eventBy,
            topic: topic,
            date: date,
            tutorId: tutorId,
            updatedAt: updatedAt,
          }
        }
      }
      tutor.events.push(addEvents)
      return tutor.save()
    })
    .then(() => {
      res.redirect('/tutor/events')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)

    })
}

exports.getEventsDetails = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    const eventId = req.params.eventId
    const eventSingle = tutor.events.find(({ _id }) => _id == eventId)

    if (eventSingle){
      if (eventSingle.tutorId == req.session.tutor._id){
        if (eventSingle.filetype == 'application/pdf') {
          const eventRead = eventSingle.file
          const file = fs.createReadStream(eventRead)
          res.setHeader('Content-Type', 'application/pdf')
          file.pipe(res)
        } else if (
          eventSingle.filetype == 'video/mp4' ||
          eventSingle.filetype == 'video/mkv' ||
          eventSingle.filetype == 'video/avi'
        ) {
          
          res.render('tutor/events-details', {
            pageTitle: 'Dashboard',
            path: '/tutor',
            sPath: '/tutor/events',
            name: tutor.name,
            editing: false,
            isAuthenticated: req.session.isTutorLoggedIn,
            event: eventSingle,
            video: true,
            notifyAssignments: studentAssignments,
            eventAccess: true,
          })
          
        } else {
          res.render('tutor/events-details', {
            pageTitle: 'Dashboard',
            path: '/tutor',
            sPath: '/tutor/events',
            name: tutor.name,
            editing: false,
            isAuthenticated: req.session.isTutorLoggedIn,
            event: eventSingle,
            video: false,
            notifyAssignments: studentAssignments,
            eventAccess: true,
          })
        }
      } else {
        if (eventSingle.filetype == 'application/pdf') {
          const eventRead = eventSingle.file
          const file = fs.createReadStream(eventRead)
          res.setHeader('Content-Type', 'application/pdf')
          file.pipe(res)
        } else if (
          eventSingle.filetype == 'video/mp4' ||
          eventSingle.filetype == 'video/mkv' ||
          eventSingle.filetype == 'video/avi'
        ) {
          res.render('tutor/events-details', {
            pageTitle: 'Dashboard',
            path: '/tutor',
            sPath: '/tutor/events',
            name: tutor.name,
            editing: false,
            isAuthenticated: req.session.isTutorLoggedIn,
            event: eventSingle,
            video: true,
            notifyAssignments: studentAssignments,
            eventAccess: eventSingle.eventAccess,
          })
        } else {
          res.render('tutor/events-details', {
            pageTitle: 'Dashboard',
            path: '/tutor',
            sPath: '/tutor/events',
            name: tutor.name,
            editing: false,
            isAuthenticated: req.session.isTutorLoggedIn,
            event: eventSingle,
            video: false,
            notifyAssignments: studentAssignments,
            eventAccess: eventSingle.eventAccess,
          })
        }
      }
    } 
  
  })
})
}

exports.postDeleteEvents = (req, res, next) => {
  const eventId = req.body.eventId

  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    const eventSingle = tutor.events.find(({ _id }) => _id == eventId)
    if (fs.existsSync(eventSingle.file)) {
      deletFiles.deleteFile(eventSingle.file, next)
    }
  })

  Tutor.findByIdAndUpdate(req.session.tutor._id, {
    $pull: { events: { _id: eventId } },
  })
    .then(() => {
      res.redirect('/tutor/events')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}


exports.postEventPayment = (req, res, next) => {
  var eventId = req.body.eventId
  var eventIdString = req.body.eventId.toString()
  var eventPrice = parseInt(req.body.eventPrice + '00')

  if (req.body.paymentMethod) {
    if (req.body.paymentMethod == 'Razor') {
      res.redirect(
        '/tutor/events/details/pay/razor?eventId=' +
          eventId +
          '&eventPrice=' +
          eventPrice
      )
    } else if (req.body.paymentMethod == 'Paypal') {
      res.redirect(
        '/tutor/events/details/pay/paypal?eventId=' +
          eventId +
          '&eventPrice=' +
          eventPrice
      )
    }
  } else {
    Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
      Student.find({ tutorId: tutor._id }, function (err, students) {
        var studentAssignments = []
        for (let student of students) {
          studentAssignments.push(student.assignments)
        }
        studentAssignments = studentAssignments
          .flat()
          .slice(Math.max(studentAssignments.length - 5, 0))
          .sort(function (a, b) {
            return new Date(a.date) - new Date(b.date)
          })
          .reverse()

          const eventSingle = tutor.events.find(({ _id }) => _id == eventId)

        res.render('tutor/events-payment', {
          pageTitle: 'Dashboard',
          path: '/tutor',
          sPath: '/tutor/events',
          name: tutor.name,
          editing: false,
          isAuthenticated: req.session.isTutorLoggedIn,
          event: eventSingle,
          notifyAssignments: studentAssignments,
          eventAccess: eventSingle.eventAccess,
        })
      })
    })
  }
}

exports.postEventPaymentRazor = (req, res, next) => {
  var eventId = req.body.eventId
  var eventIdString = req.body.eventId.toString()
  var eventPrice = parseInt(req.body.eventPrice + '00')

  //RazorPay
  var options = {
    amount: eventPrice, // amount in the smallest currency unit
    currency: 'INR',
    receipt: eventIdString,
  }
  instance.orders.create(options, function (err, order) {
    if (err) {
      console.log(err)
    } else {
      console.log(order)
      Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
        Student.find({ tutorId: tutor._id }, function (err, students) {
          var studentAssignments = []
          for (let student of students) {
            studentAssignments.push(student.assignments)
          }
          studentAssignments = studentAssignments
            .flat()
            .slice(Math.max(studentAssignments.length - 5, 0))
            .sort(function (a, b) {
              return new Date(a.date) - new Date(b.date)
            })
            .reverse()

          const eventSingle = tutor.events.find(({ _id }) => _id == eventId)
          res.render('tutor/events-payment-razor', {
            pageTitle: 'Dashboard',
            path: '/tutor',
            sPath: '/tutor/events',
            name: tutor.name,
            editing: false,
            isAuthenticated: req.session.isTutorLoggedIn,
            event: eventSingle,
            notifyAssignments: studentAssignments,
            eventAccess: eventSingle.eventAccess,
            eventOrder: order,
          })
        })
      })
    }
  })
}

exports.postEventPaymentRazorVerify = (req, res, next) => {
  var eventId = req.body.eventId
  var razorpay_order_id = req.body.razorpay_order_id
  var razorpay_payment_id = req.body.razorpay_payment_id
  var razorpay_signature = req.body.razorpay_signature

  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = []
      for (let student of students) {
        studentAssignments.push(student.assignments)
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()

      const eventSingle = tutor.events.find(({ _id }) => _id == eventId)
      const crypto = require('crypto')
      var secret = process.env.RAZORPAY_KEY_SECRET
      const hash = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex')

      if (hash == razorpay_signature) {
        console.log('Payment Success')
        eventSingle.eventAccess = true
        return tutor
          .save()
          .then(() => {
            res.redirect('/tutor/events/details/' + eventId)
          })
          .catch((err) => {
           const error = new Error(err)
           error.httpStatusCode = 500
           return next(error)
          })
      } else {
        console.log('Payment Failed')
        res.redirect('/tutor/events')
      }
    })
  })
}

exports.postEventPaymentPaypal = (req, res, next) => {
  var eventId = req.body.eventId
  var eventIdString = req.body.eventId.toString()
  var eventPrice = parseInt(req.body.eventPrice)

  //Paypal
  var create_payment_json = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal',
    },
    redirect_urls: {
      return_url:
        `${process.env.HOST_NAME}/tutor/events/details/pay/paypal/verify?eventId=` +
        eventId,
      cancel_url: `${process.env.HOST_NAME}/tutor/events`,
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: eventIdString,
              sku: '001',
              price: eventPrice,
              currency: 'INR',
              quantity: 1,
            },
          ],
        },
        amount: {
          currency: 'INR',
          total: eventPrice,
        },
        description: 'This is the payment for an  Event.',
      },
    ],
  }

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      console.log(error)
    } else {
      console.log('Create Payment Response')
      console.log(payment)
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === 'approval_url') {
          res.redirect(payment.links[i].href)
        }
      }
    }
  })
}

exports.postEventPaymentPaypalVerify = (req, res, next) => {
  var eventId = req.query.eventId

  const payerId = req.query.PayerID
  const paymentId = req.query.paymentId

  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      const eventSingle = tutor.events.find(({ _id }) => _id == eventId)

      const execute_payment_json = {
        payer_id: payerId,
        transactions: [
          {
            amount: {
              currency: 'INR',
              total: eventSingle.eventPrice,
            },
          },
        ],
      }

      paypal.payment.execute(
        paymentId,
        execute_payment_json,
        function (error, payment) {
          if (error) {
            console.log(error.response)
            res.redirect('/tutor/events')
          } else {
            console.log(JSON.stringify(payment))
            // res.send('Success')
            eventSingle.eventAccess = true
            return tutor
              .save()
              .then(() => {
                var eventLink = '/tutor/events/details/' + eventId
                res.redirect(eventLink)
              })
              .catch((err) => {
                const error = new Error(err)
                error.httpStatusCode = 500
                return next(error)
              })
          }
        }
      )
    })
  })
}



exports.postEventPaymentPaytm = (req, res, next) => {
  var eventId = req.body.eventId
  var eventIdString = req.body.eventId.toString()
  var eventPrice = parseInt(req.body.eventPrice)
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      const eventSingle = tutor.events.find(({ _id }) => _id == eventId)

      //--------------------------------------------------

      // var paymentDetails = {
      //   amount: eventSingle.eventPrice,
      //   customerId: student._id,
      //   customerEmail: student.email,
      //   customerPhone: student.mobile,
      // }

      var paymentDetails = {
        amount: req.body.eventPrice.toString(),
        customerId: tutor._id.toString(),
        customerEmail: tutor.email.toString(),
        customerPhone: tutor.mobile.toString(),
      }

      if (
        !paymentDetails.amount ||
        !paymentDetails.customerId ||
        !paymentDetails.customerEmail ||
        !paymentDetails.customerPhone
      ) {
        res.status(400).send('Payment failed')
      } else {
        var params = {}
        params['MID'] = config.PaytmConfig.mid
        params['WEBSITE'] = config.PaytmConfig.website
        params['CHANNEL_ID'] = 'WEB'
        params['INDUSTRY_TYPE_ID'] = 'Retail'
        params['ORDER_ID'] = 'Class@Home' + new Date().getTime()
        params['CUST_ID'] = paymentDetails.customerId
        params['TXN_AMOUNT'] = paymentDetails.amount
        params['CALLBACK_URL'] =
          `${process.env.HOST_NAME}/tutorPaytmCallback?eventId=` +
          eventId +
          '&tutorId=' +
          tutor._id
        params['EMAIL'] = paymentDetails.customerEmail
        params['MOBILE_NO'] = paymentDetails.customerPhone

        checksum_lib.genchecksum(
          params,
          config.PaytmConfig.key,
          function (err, checksum) {
            var txn_url =
              'https://securegw-stage.paytm.in/theia/processTransaction' // for staging
            // var txn_url = "https://securegw.paytm.in/theia/processTransaction"; // for production

            var form_fields = ''
            for (var x in params) {
              form_fields +=
                "<input type='hidden' name='" +
                x +
                "' value='" +
                params[x] +
                "' >"
            }
            form_fields +=
              "<input type='hidden' name='CHECKSUMHASH' value='" +
              checksum +
              "' >"

            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.write(
              '<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' +
                txn_url +
                '" name="f1">' +
                form_fields +
                '</form><script type="text/javascript">document.f1.submit();</script></body></html>'
            )

            res.end()
          }
        )
      }
    })
  })
}

exports.postEventPaymentPaytmVerify = (req, res, next) => {
  console.log('paytm tutor Controll')
  // // Route for verifiying payment
  const eventId = req.query.eventId
  const tutorId = req.query.tutorId

  paytmChecksum = req.body.CHECKSUMHASH
  if (!paytmChecksum) {
    return res.redirect('/tutor/events')
  }
  delete req.body.CHECKSUMHASH

  var isVerifySignature = PaytmChucksum.verifySignature(
    req.body,
    process.env.PAYTM_CONFIG_KEY,
    paytmChecksum
  )
  if (isVerifySignature) {
    console.log('Checksum Matched')
    Tutor.findOne({ _id: tutorId }, function (err, tutor) {
      Student.find({ tutorId: tutor._id }, function (err, students) {
        const eventSingle = tutor.events.find(({ _id }) => _id == eventId)
        eventSingle.eventAccess = true
        return tutor
          .save()
          .then(() => {
            var eventLink = '/tutor/events/details/' + eventId
            res.redirect(eventLink)
          })
          .catch((err) => {
            const error = new Error(err)
            error.httpStatusCode = 500
            return next(error)
          })
      })
    })
  } else {
    console.log('Checksum Mismatched')
    res.redirect('/tutor/events')
  }
}

exports.getPhotos = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    res.render('tutor/images', {
      pageTitle: 'Dashboard',
      path: '/tutor',
      sPath: '/tutor/images',
      name: tutor.name,
      editing: false,
      isAuthenticated: req.session.isTutorLoggedIn,
      images: tutor.images,
      notifyAssignments: studentAssignments,
    })
  })
})
}

exports.postAddImages = (req, res, next) => {
  
  const tutorId = req.session.tutor._id
  const name = req.body.inputName
  const file = req.file;
  var cropX = Number(req.body.croppedImgX)
  var cropY = Number(req.body.croppedImgY)
  var cropW = Number(req.body.croppedImgW)
  var cropH = Number(req.body.croppedImgH)
  if (file) {
    var url = file.path
  }
  const cropCheck = req.body.cropCheck;
  if (cropCheck == 'true') {

    Clipper.configure('canvas', canvas)

    Clipper(url, function () {
      this.crop(cropX, cropY, cropW, cropH).toFile(url, function () {
        // console.log('saved!')
      })
    })
  }

  const date = new Date().toLocaleDateString()

  Tutor.findOne({ _id: req.session.tutor._id })
    .then((tutor) => {
      var addImages = {}
      if (file) {
        addImages = {
          name: name,
          date: date,
          imageUrl: url,
          tutorId: tutorId,
        }
      } else if (imageUrl) {
        addImages = {
          name: name,
          date: date,
          imageSrc: imageUrl,
          tutorId: tutorId,
        }
      } else {
        addImages = {
          name: name,
          date: date,
          tutorId: tutorId,
        }
      }

      tutor.images.push(addImages)
      return tutor.save()
    })
    .then(() => {
      res.redirect('/tutor/images')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getImageDetails = (req, res, next) => {
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    Student.find({ tutorId: tutor._id }, function (err, students) {
      var studentAssignments = [];
      for (let student of students) {
        studentAssignments.push(student.assignments);
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()
      
    const imageId = req.params.imageId
    const image = tutor.images.find(({ _id }) => _id == imageId)
    res.render('tutor/images-details', {
      pageTitle: 'Dashboard',
      path: '/tutor',
      sPath: '/tutor/images',
      name: tutor.name,
      editing: false,
      isAuthenticated: req.session.isTutorLoggedIn,
      image: image,
      notifyAssignments: studentAssignments,
    })
  })
})
}

exports.postDeleteImages = (req, res, next) => {
  const imageId = req.body.imageId
  Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
    const image = tutor.images.find(({ _id }) => _id == imageId)
    if(image){
      if (fs.existsSync(image.imageUrl)) {
        deletFiles.deleteFile(image.imageUrl, next)
      }
    }
  })
  Tutor.findByIdAndUpdate(req.session.tutor._id, {
    $pull: { images: { _id: imageId } },
  })
    .then(() => {
      res.redirect('/tutor/images')
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getChat = (req, res, next) => {
  var studentId = req.query.studentId;
  var videoId = uuid()
  if (studentId == null || studentId == undefined || studentId == ''){
    Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
      Student.find({ tutorId: tutor._id }, function (err, allStudents) {
        var studentAssignments = []
        for (let student of allStudents) {
          studentAssignments.push(student.assignments)
        }
        studentAssignments = studentAssignments
          .flat()
          .slice(Math.max(studentAssignments.length - 5, 0))
          .sort(function (a, b) {
            return new Date(a.date) - new Date(b.date)
          })
          .reverse()
        
        var defaultChat = allStudents[0].chat
        var tutorChat = tutor.chat.filter(({ sId }) => sId == allStudents[0]._id)
        var tutorStudentChat = tutorChat.concat(defaultChat)
        tutorStudentChat.sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })


        res.render('tutor/chat', {
          pageTitle: 'Dashboard',
          path: '/tutor',
          sPath: '/tutor/chat',
          name: tutor.name,
          editing: false,
          isAuthenticated: req.session.isTutorLoggedIn,
          notifyAssignments: studentAssignments,
          chats: tutorStudentChat,
          allStudents: allStudents,
          queryStudent: studentId,
          defaultStudentId: allStudents[0]._id,
          isChat: false,
        })
      })
    })
  } else {
    Tutor.findOne({ _id: req.session.tutor._id }, function (err, tutor) {
      Student.find({ tutorId: tutor._id }, function (err, allStudents) {
      Student.findById({ _id: studentId }, function (err, students) {
        var studentAssignments = []
        for (let student of allStudents) {
          studentAssignments.push(student.assignments)
        }
        studentAssignments = studentAssignments
          .flat()
          .slice(Math.max(studentAssignments.length - 5, 0))
          .sort(function (a, b) {
            return new Date(a.date) - new Date(b.date)
          })
          .reverse()

          var tutorChat = tutor.chat.filter(({ sId }) => sId == studentId)
          var tutorStudentChat = tutorChat.concat(students.chat)
          tutorStudentChat.sort(function (a, b) {
            return new Date(a.date) - new Date(b.date)
          })


        res.render('tutor/chat', {
          pageTitle: 'Dashboard',
          path: '/tutor',
          sPath: '/tutor/chat',
          name: tutor.name,
          editing: false,
          isAuthenticated: req.session.isTutorLoggedIn,
          notifyAssignments: studentAssignments,
          student: students,
          chats: tutorStudentChat,
          allStudents: allStudents,
          queryStudent: studentId,
          defaultStudentId: allStudents[0]._id,
          isChat: true,
          videoId: videoId
        })
      })
    })
  })
  }
}

exports.postChatAdd = (req, res, next) => {
  const sId = req.body.sId
  const message = req.body.chatMessage
  const voice = req.file
  if (voice) {
    var voiceUrl = voice.path
    var voiceType = voice.mimetype
  }
  const date = new Date().toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  Tutor.findOne({ _id: req.session.tutor._id })
    .then((tutor) => {
      var chat = {}
      if (voice) {
        chat = {
          message: message,
          date: date,
          sId: sId,
          voiceUrl: voiceUrl,
          voiceType: voiceType,
        }
      } else {
        chat = {
          message: message,
          date: date,
          sId: sId,
        }
      }
      tutor.chat.push(chat)
      return tutor.save()
    })
    .then(() => {
      io.getIO().emit('chat', {
        action: 'chat-add'
      })
      console.log(sId);
      var redirectUrl = '/tutor/chat/?studentId='+sId;
      res.redirect(redirectUrl)
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getVideoChat = (req,res,next) => {
  console.log('getVideoChat')
  var videoId  = req.params.videoId;
  // console.log(videoId)

  Tutor.findOne({ _id: req.session.tutor._id },  function (err, tutor) {
    Student.find({ tutorId: tutor._id }, async function (err, students) {
      var studentAssignments = []
      for (let student of students) {
        studentAssignments.push(student.assignments)
      }
      studentAssignments = studentAssignments
        .flat()
        .slice(Math.max(studentAssignments.length - 5, 0))
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date)
        })
        .reverse()

      const sId = req.query.sId
      console.log(sId)
      const message2 = `${process.env.HOST_NAME}/student/chat/video/` + videoId
      const date = new Date().toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })

      // Tutor.findOne({ _id: req.session.tutor._id })
      //   .then((tutor) => {
      var chat = {}
      chat2 = {
        message: message2,
        date: date,
        sId: sId,
        videoId: true
      }
      tutor.chat.push(chat2)
      var inviteVideo = await tutor.save()

      // io.getIO().emit('chat', {
      //   action: 'chat-add',
      // })
      
      res.render('tutor/video-chat', {
        pageTitle: 'Dashboard',
        path: '/tutor',
        sPath: '/tutor/chat',
        name: tutor.name,
        editing: false,
        isAuthenticated: req.session.isTutorLoggedIn,
        notifyAssignments: studentAssignments,
      })
      
      
    })
  })
}



//Login Routes
exports.getLogin = (req, res, next) => {
  if (req.session.isTutorLoggedIn) {
    res.redirect('/tutor')
  }
  let message = req.flash('error')
  if (message.length > 0) {
    message = message[0]
  } else {
    message = null
  }
  res.render('tutor/login', {
    path: '/login',
    pageTitle: 'Login',
    isAuthenticated: req.session.isTutorLoggedIn,
    errorMessage: message,
  })
}

exports.getSignup = (req, res, next) => {
  res.render('tutor/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: req.session.isTutorLoggedIn,
  })
}

exports.postLogin = (req, res, next) => {
  const email = req.body.email
  const password = req.body.password
  const errros = validationResult(req)
  Tutor.findOne({ email: email })
    .then((tutor) => {
      if (!tutor) {
        req.flash('error','Invalid Email or Password')
        res.redirect('/tutor/login')
      }
      bcrypt
        .compare(password, tutor.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isTutorLoggedIn = true
            req.session.tutor = tutor
            return req.session.save((err) => {
              console.log(err)

              res.redirect('/tutor')
            })
          }
          req.flash('error', 'Invalid Email or Password')
          res.redirect('/tutor/login')
        })
        .catch((err) => {
          console.log(err)
          res.redirect('/tutor/login')
        })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postSignup = (req, res, next) => {
  const email = req.body.email
  const password = req.body.password
  const confirmPassword = req.body.confirmPassword
  Tutor.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        return res.redirect('/tutor/signup')
      }
      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const tutor = new Tutor({
            email: email,
            password: hashedPassword,
          })
          return tutor.save()
        })
        .then((result) => {
          res.redirect('/tutor/login')
        })
        .catch((err) => {
          const error = new Error(err)
          error.httpStatusCode = 500
          return next(error)
        })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.getOtpLogin = (req, res, next) => {
  if (req.session.isTutorLoggedIn) {
    res.redirect('/tutor')
  }

  let message = req.flash('error')
  if (message.length > 0) {
    message = message[0]
  } else {
    message = null
  }

  res.render('tutor/loginviaotp', {
    path: '/login',
    pageTitle: 'Login',
    isAuthenticated: req.session.isTutorLoggedIn,
    getOtp: false,
    errorMessage: message
  })
}

exports.postSendOtp = (request, response, next) => {
  var mobile = request.body.phone
  Tutor.findOne({ mobile: mobile })
    .then((tutor) => {
      if (!tutor) {
        request.flash('error', 'Invalid Mobile No.')
        response.redirect('/tutor/login/otp')
      }
      var req = unirest('POST', 'https://d7networks.com/api/verifier/send')
        .headers({
          Authorization: `Token ${process.env.D7NETWORKS_TOKEN}`,
        })
        .field('mobile', '+91' + mobile)
        .field('sender_id', 'SMSINFO')
        .field('message', 'Your otp code for Class@Home is {code}')
        .field('expiry', '900')
        .followRedirect(false)
        .end(function (res) {
          if (res.error) {
            console.log(res.error)
          }
          var otpDetails = res.raw_body
          var b = JSON.parse(otpDetails)
          var smsId = b.otp_id
          if (smsId) {
            request.session.tutorOtpPhone = mobile
            request.session.tutorOtpId = smsId
          }

          response.render('tutor/loginviaotp', {
            path: '/login',
            pageTitle: 'Login',
            isAuthenticated: false,
            getOtp: true,
            errorMessage: null,
          })
        })
    })
    .catch((err) => {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    })
}

exports.postOtpVerify = (request, response, next) => {
  const getOtp = request.body.otp;
  if (request.session.tutorOtpId){
    var req = unirest('POST', 'https://d7networks.com/api/verifier/verify')
      .headers({
        Authorization: `Token ${process.env.D7NETWORKS_TOKEN}`,
      })
      .field('otp_id', request.session.tutorOtpId)
      .field('otp_code', getOtp)
      .end(function (res) {
        if (res.error) {
          console.log(res.error)
          request.flash('error', 'Invalid Otp')
          response.redirect('/tutor/login/otp')
        }
        console.log(res.raw_body)
        var otpDetails = res.raw_body
        var b = JSON.parse(otpDetails)
        if (b.status == 'success') {
          Tutor.findOne({ mobile: request.session.tutorOtpPhone }).then(
            (tutor) => {
              request.session.isTutorLoggedIn = true
              request.session.tutor = tutor
              return request.session.save((err) => {
                response.redirect('/tutor')
              })
            }
          )
        } else {
          request.flash('error', 'Invalid Otp')
          response.redirect('/tutor/login/otp')
        }
      })
  } else {
    request.flash('error', 'Invalid Otp')
    response.redirect('/tutor/login/otp')
  }   
}

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    } else {
      res.redirect('/')
    }
  })
}
