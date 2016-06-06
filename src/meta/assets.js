var webpack = require('webpack'),
	path = require('path');

var assets = {
	_compiler: webpack({
		context: path.join(__dirname, '../..'),
		entry: {
			core: [
				'./public/vendor/jquery/js/jquery.js',
				'./node_modules/socket.io-client/socket.io.js',
				'./public/vendor/jquery/timeago/jquery.timeago.js',
				'./public/vendor/jquery/js/jquery.form.min.js',
				'./public/vendor/visibility/visibility.min.js',
				'./public/vendor/bootstrap/js/bootstrap.min.js',
				'./public/vendor/jquery/bootstrap-tagsinput/bootstrap-tagsinput.min.js',
				'./public/vendor/jquery/textcomplete/jquery.textcomplete.js',
				// './public/vendor/requirejs/require.js',
				'./public/vendor/bootbox/bootbox.min.js',
				'./public/vendor/tinycon/tinycon.js',
				'./public/vendor/xregexp/xregexp.js',
				'./public/vendor/xregexp/unicode/unicode-base.js',
				'./public/vendor/autosize.js',
				'./node_modules/templates.js/lib/templates.js',
				'./public/src/utils.js',
				'./public/src/sockets.js',
				// './public/src/app.js',
				'./public/src/ajaxify.js',
				// './public/src/overrides.js',
				'./public/src/variables.js',
				'./public/src/widgets.js'
			]
		},
		externals: [
			'translator',
			/^client\/.+$/,
			/^admin\/.+$/
		],
		node: {
			// https://github.com/webpack/jade-loader/issues/8, because raisins
			fs: 'empty'
		},
		output: {
			filename: '[name].bundle.js',
			path: path.join(__dirname, '../../public/build')
		},
		resolve: {
			modulesDirectories: ['src/modules', 'node_modules'],
			alias: {
				client: path.join(__dirname, '../../public/src/client'),
				admin: path.join(__dirname, '../../public/src/admin')
			}
		},
		plugins: [
			new webpack.ProvidePlugin({
				$: "jquery",
				jQuery: "jquery",
				"windows.jQuery": "jquery"
			})
		]
	})
};

assets.build = function(callback) {
	assets._compiler.run(function(err, stats) {
		console.log(stats);
		process.exit(0);
	});
};

module.exports = assets;