"use strict";

var nconf = require('nconf');
var path = require('path');
var async = require('async');
var winston = require('winston');
var controllers = require('../controllers');
var plugins = require('../plugins');
var user = require('../user');
var express = require('express');
var validator = require('validator');

var accountRoutes = require('./accounts');

var metaRoutes = require('./meta');
var apiRoutes = require('./api');
var adminRoutes = require('./admin');
var feedRoutes = require('./feeds');
var pluginRoutes = require('./plugins');
var authRoutes = require('./authentication');
var helpers = require('./helpers');

var setupPageRoute = helpers.setupPageRoute;

function mainRoutes(app, middleware, controllers) {
	setupPageRoute(app, '/', middleware, [], controllers.home);

	var loginRegisterMiddleware = [middleware.redirectToAccountIfLoggedIn];

	setupPageRoute(app, '/login', middleware, loginRegisterMiddleware, controllers.login);
	setupPageRoute(app, '/register', middleware, loginRegisterMiddleware, controllers.register);
	setupPageRoute(app, '/register/complete', middleware, [], controllers.registerInterstitial);
	setupPageRoute(app, '/compose', middleware, [], controllers.compose);
	setupPageRoute(app, '/confirm/:code', middleware, [], controllers.confirmEmail);
	setupPageRoute(app, '/outgoing', middleware, [], controllers.outgoing);
	setupPageRoute(app, '/search/:term?', middleware, [], controllers.search.search);
	setupPageRoute(app, '/reset/:code?', middleware, [], controllers.reset);
	setupPageRoute(app, '/tos', middleware, [], controllers.termsOfUse);
}

function globalModRoutes(app, middleware, controllers) {
	setupPageRoute(app, '/ip-blacklist', middleware, [], controllers.globalMods.ipBlacklist);
	setupPageRoute(app, '/posts/flags', middleware, [], controllers.globalMods.flagged);
}

function topicRoutes(app, middleware, controllers) {
	setupPageRoute(app, '/topic/:topic_id/:slug/:post_index?', middleware, [], controllers.topics.get);
	setupPageRoute(app, '/topic/:topic_id/:slug?', middleware, [], controllers.topics.get);
}

function postRoutes(app, middleware, controllers) {
	setupPageRoute(app, '/post/:pid', middleware, [], controllers.posts.redirectToPost);
}

function tagRoutes(app, middleware, controllers) {
	setupPageRoute(app, '/tags/:tag', middleware, [middleware.privateTagListing], controllers.tags.getTag);
	setupPageRoute(app, '/tags', middleware, [middleware.privateTagListing], controllers.tags.getTags);
}

function categoryRoutes(app, middleware, controllers) {
	setupPageRoute(app, '/categories', middleware, [], controllers.categories.list);
	setupPageRoute(app, '/popular/:term?', middleware, [], controllers.popular.get);
	setupPageRoute(app, '/recent', middleware, [], controllers.recent.get);
	setupPageRoute(app, '/unread/:filter?', middleware, [middleware.authenticate], controllers.unread.get);

	setupPageRoute(app, '/category/:category_id/:slug/:topic_index', middleware, [], controllers.category.get);
	setupPageRoute(app, '/category/:category_id/:slug?', middleware, [], controllers.category.get);
}

function userRoutes(app, middleware, controllers) {
	var middlewares = [middleware.checkGlobalPrivacySettings];

	setupPageRoute(app, '/users', middleware, middlewares, controllers.users.getUsersSortedByJoinDate);
	setupPageRoute(app, '/users/online', middleware, middlewares, controllers.users.getOnlineUsers);
	setupPageRoute(app, '/users/sort-posts', middleware, middlewares, controllers.users.getUsersSortedByPosts);
	setupPageRoute(app, '/users/sort-reputation', middleware, middlewares, controllers.users.getUsersSortedByReputation);
	setupPageRoute(app, '/users/banned', middleware, middlewares, controllers.users.getBannedUsers);
	setupPageRoute(app, '/users/flagged', middleware, middlewares, controllers.users.getFlaggedUsers);
}

function groupRoutes(app, middleware, controllers) {
	var middlewares = [middleware.checkGlobalPrivacySettings, middleware.exposeGroupName];

	setupPageRoute(app, '/groups', middleware, middlewares, controllers.groups.list);
	setupPageRoute(app, '/groups/:slug', middleware, middlewares, controllers.groups.details);
	setupPageRoute(app, '/groups/:slug/members', middleware, middlewares, controllers.groups.members);
}

module.exports = function(app, middleware, hotswapIds) {
	var routers = [
			express.Router(),	// plugin router
			express.Router(),	// main app router
			express.Router()	// auth router
		],
		router = routers[1],
		pluginRouter = routers[0],
		authRouter = routers[2],
		relativePath = nconf.get('relative_path'),
		ensureLoggedIn = require('connect-ensure-login');

	if (Array.isArray(hotswapIds) && hotswapIds.length) {
		for(var idx,x=0;x<hotswapIds.length;x++) {
			idx = routers.push(express.Router()) - 1;
			routers[idx].hotswapId = hotswapIds[x];
		}
	}

	pluginRouter.render = function() {
		app.render.apply(app, arguments);
	};
	controllers.render = function() {
		app.render.apply(app, arguments);
	};

	// Set-up for hotswapping (when NodeBB reloads)
	pluginRouter.hotswapId = 'plugins';
	authRouter.hotswapId = 'auth';

	app.use(middleware.maintenanceMode);

	app.all(relativePath + '(/api|/api/*?)', middleware.prepareAPI);
	app.all(relativePath + '(/api/admin|/api/admin/*?)', middleware.isAdmin);
	app.all(relativePath + '(/admin|/admin/*?)', ensureLoggedIn.ensureLoggedIn(nconf.get('relative_path') + '/login?local=1'), middleware.applyCSRF, middleware.isAdmin);

	adminRoutes(router, middleware, controllers);
	metaRoutes(router, middleware, controllers);
	apiRoutes(router, middleware, controllers);
	feedRoutes(router, middleware, controllers);
	pluginRoutes(router, middleware, controllers);

	mainRoutes(router, middleware, controllers);
	topicRoutes(router, middleware, controllers);
	postRoutes(router, middleware, controllers);
	globalModRoutes(router, middleware, controllers);
	tagRoutes(router, middleware, controllers);
	categoryRoutes(router, middleware, controllers);
	accountRoutes(router, middleware, controllers);
	userRoutes(router, middleware, controllers);
	groupRoutes(router, middleware, controllers);

	for(var x=0;x<routers.length;x++) {
		app.use(relativePath, routers[x]);
	}

	if (process.env.NODE_ENV === 'development') {
		require('./debug')(app, middleware, controllers);
	}

	app.use(middleware.privateUploads);
	app.use('/language/:code', middleware.processLanguages);
	app.use(relativePath, express.static(path.join(__dirname, '../../', 'public'), {
		maxAge: app.enabled('cache') ? 5184000000 : 0
	}));
	app.use('/vendor/jquery/timeago/locales', middleware.processTimeagoLocales);
	app.use(controllers.handle404);
	app.use(controllers.handleErrors);

	// Add plugin routes
	async.series([
		async.apply(plugins.reloadRoutes),
		async.apply(authRoutes.reloadRoutes),
		async.apply(user.addInterstitials)
	]);
};
