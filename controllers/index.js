

exports.getIndex = (req, res, next) => {

 res.render('index', {
   pageTitle: 'Home Page',
   path: '/index',
   isAuthenticated: req.session.isTutorLoggedIn,
   notifyAssignments: [],
 })
};