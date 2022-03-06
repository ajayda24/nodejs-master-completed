module.exports = (req, res, next) => {
    if (!req.session.isTutorLoggedIn) {
        return res.redirect('/tutor/login');
    }
    next();
}