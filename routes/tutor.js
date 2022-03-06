const path = require('path');

const express = require('express');
const { check, body } = require('express-validator')
const multer = require('multer')

const tutorController = require('../controllers/tutor');
const tutorAuth = require('../middleware/tutor-auth');

const router = express.Router();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    tutorId = req.session.tutor._id.toString()
    cb(null, 'tutorFiles/' + tutorId)
  },
  filename: (req, file, cb) => {
    cb(null, new Date().getTime() + '-' + file.originalname)
  },
})

router.use(multer({ storage: fileStorage }).single('files'))

// /tutor/index => GET
router.get('/',tutorAuth, tutorController.getIndex);

// /tutor/profile => GET
router.get('/profile',tutorAuth, tutorController.getProfile);

// /tutor/profile/edit => GET
router.get('/profile/edit/:tutorId',tutorAuth, tutorController.getEditProfile);

// /tutor/profile/edit => POST
router.post('/profile/edit',tutorAuth, tutorController.postEditProfile);

// /tutor/students => GET
router.get('/students',tutorAuth, tutorController.getStudents);

// /tutor/students/details => GET
router.get('/students/details/:studentId',tutorAuth, tutorController.getDetailsStudent);

// /tutor/students/add => GET
router.get('/students/add',tutorAuth, tutorController.getAddStudents);

// /tutor/students/add => POST
router.post('/students/add',tutorAuth, tutorController.postAddStudents);

// /tutor/students/edit => GET
router.get('/students/edit/:studentId',tutorAuth, tutorController.getEditStudent);

// /tutor/students/edit => POST
router.post('/students/edit',tutorAuth, tutorController.postEditStudents);

// /tutor/students/delete => POST
router.post('/students/delete',tutorAuth, tutorController.postDeleteStudents);



// /tutor/attendance => GET
router.get('/attendance',tutorAuth, tutorController.getAttendance);

// /tutor/attendance => POST
router.post('/attendance/search',tutorAuth,tutorController.postSearchAttendance);

// /tutor/attendance/single => GET
router.get('/attendance/single/:studentId',tutorAuth,tutorController.getSingleStudentAttendance)

// /tutor/assignments => GET
router.get('/assignments',tutorAuth, tutorController.getAssignments);

// /tutor/assignments/details => GET
router.get('/assignments/details/:assignmentId',tutorAuth, tutorController.getAssignmentsDetails);

// /tutor/assignments/details => GET
router.get('/assignments/details/:assignmentId/:studentId',tutorAuth, tutorController.getAssignmentsDetails);

// /tutor/assignments/details => POST
router.post(
  '/assignments/details/:assignmentId/:studentId',
  tutorAuth,
  tutorController.postStudentAssignmentMark
)

// /tutor/assignments/add => POST
router.post('/assignments/add',tutorAuth, tutorController.postAddAssignments);

// /tutor/assignments/delete => POST
router.post('/assignments/delete',tutorAuth, tutorController.postDeleteAssignments);

// /tutor/notes => GET
router.get('/notes',tutorAuth, tutorController.getNotes);

// /tutor/notes/add => POST
router.post('/notes/add',tutorAuth, tutorController.postAddNotes);

// /tutor/notes/details => GET
router.get('/notes/details/:notesId',tutorAuth, tutorController.getNotesDetails);

// /tutor/notes/delete => POST
router.post('/notes/delete',tutorAuth, tutorController.postDeleteNotes);


// /tutor/announcements => GET
router.get('/announcements',tutorAuth, tutorController.getAnnouncements);

// /tutor/announcements/add => POST
router.post('/announcements/add',tutorAuth, tutorController.postAddAnnouncements);

// /tutor/announcements/details => GET
router.get('/announcements/details/:announcementId',tutorAuth, tutorController.getAnnouncementsDetails);

// /tutor/announcements/delete => POST
router.post('/announcements/delete',tutorAuth, tutorController.postDeleteAnnouncements);

// /tutor/events => GET
router.get('/events',tutorAuth, tutorController.getEvents);

// /tutor/events/add => POST
router.post('/events/add',tutorAuth, tutorController.postAddEvents);

// /tutor/events/details => GET
router.get('/events/details/:eventId',tutorAuth, tutorController.getEventsDetails);


// /tutor/events/details/pay => POST
router.post('/events/details/pay', tutorAuth, tutorController.postEventPayment)

// /tutor/events/details/pay/razor => POST
router.post('/events/details/pay/razor',tutorAuth,tutorController.postEventPaymentRazor)

// /tutor/events/details/pay/razor/verify => POST
router.post('/events/details/pay/razor/verify',tutorAuth,tutorController.postEventPaymentRazorVerify)

// /tutor/events/details/pay/paypal => POST
router.post('/events/details/pay/paypal',tutorAuth,tutorController.postEventPaymentPaypal)

// /tutor/events/details/pay/paypal/verify => POST
router.get('/events/details/pay/paypal/verify',tutorAuth,tutorController.postEventPaymentPaypalVerify)

// /student/events/details/pay/paytm => POST
router.post('/events/details/pay/paytm',tutorAuth,tutorController.postEventPaymentPaytm)


// /tutor/events/delete => POST
router.post('/events/delete',tutorAuth, tutorController.postDeleteEvents);

// /tutor/images => GET
router.get('/images',tutorAuth, tutorController.getPhotos);

// /tutor/images/add => POST
router.post('/images/add',tutorAuth, tutorController.postAddImages);

// /tutor/images/details => GET
router.get('/images/details/:imageId',tutorAuth, tutorController.getImageDetails);

// /tutor/images/delete => POST
router.post('/images/delete',tutorAuth, tutorController.postDeleteImages);

// /tutor/chat => GET
router.get('/chat', tutorAuth, tutorController.getChat)

// /tutor/chat/add => POST
router.post('/chat/add', tutorAuth, tutorController.postChatAdd)

// /tutor/chat/video => GET
router.get('/chat/video/:videoId', tutorAuth, tutorController.getVideoChat)




// /tutor/login => GET
router.get('/login', tutorController.getLogin);

// /tutor/signup => GET
router.get('/signup', tutorController.getSignup);

// /tutor/login => POST
router.post('/login', tutorController.postLogin);

// /tutor/signup => POST
router.post('/signup', tutorController.postSignup);

// /tutor/login/otp => GET
router.get('/login/otp', tutorController.getOtpLogin)

// /tutor/login/otp/send => POST
router.post('/login/otp/send', tutorController.postSendOtp)

// /tutor/login/otp/verify => POST
router.post('/login/otp/verify', tutorController.postOtpVerify)

// /tutor/logout => POST
router.post('/logout', tutorController.postLogout);

module.exports = router;