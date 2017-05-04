let botauth = require('botauth');
let authStrategy = require(`passport-${process.env.AUTH_PROVIDER_NAME}`).Strategy;
let session = require('express-session');

let authenticator;
let profile;

let botAuthOptions = {
    baseUrl: `https://${process.env.WEBSITE_HOSTNAME}`,
    secret: process.env.BOTAUTH_SECRET
};

let strategyVerifyFunction = (accessToken, refreshToken, profile, done) => {
    profile = profile || {};
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    return done(null, profile);
};

module.exports = {
    initialize: (server, bot) => {
        server.use(session({ secret: process.env.BOTAUTH_SECRET }));
        authenticator = new botauth.BotAuthenticator(server, bot, botAuthOptions)
            .provider(
            process.env.AUTH_PROVIDER_NAME,
            options => new authStrategy({
                consumerKey: process.env.AUTH_PROVIDER_APP_ID,
                consumerSecret: process.env.AUTH_PROVIDER_APP_SECRET,
                callbackURL: options.callbackURL
            }, strategyVerifyFunction)
            );
        return authenticator;
    },
    isAuthenticated: (profile ? true : false),
    profile: () => authenticator.profile(session, process.env.AUTH_PROVIDER_NAME),
    requireAuthentication: dialogFunctions => {
        //if already logged in, then just return the caller's dialogFunctions
        if(profile) return dialogFunctions;
        
        let authFunctions = authenticator.authenticate(process.env.AUTH_PROVIDER_NAME);
        authFunctions.push((session, args, next) => {
            session.privateConversationData.user = authenticator.profile(session, process.env.AUTH_PROVIDER_NAME);
            next();
        });
        let allFunctions = authFunctions.concat(dialogFunctions);
        return allFunctions;
    },
    logout: session => authenticator.logout(session, process.env.AUTH_PROVIDER_NAME)
};