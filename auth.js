const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const { supabase } = require('./services');

// Local strategy for login
passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    // Find user by email in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !user) return done(null, false, { message: 'Incorrect email or password.' });
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return done(null, false, { message: 'Incorrect email or password.' });
    return done(null, user);
  })
);

// JWT strategy for protected routes
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};
passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    // Find user by id in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', jwt_payload.id)
      .single();
    if (error || !user) return done(null, false);
    return done(null, user);
  })
);

module.exports = passport; 