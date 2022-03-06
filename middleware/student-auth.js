module.exports = (req, res, next) => {
 if (!req.session.isStudentLoggedIn) {
     return res.redirect('/student/login');
 }
 next();
}