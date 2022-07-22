const path = require('path');

const CircularDependencyPlugin = require('circular-dependency-plugin');

module.exports = {
	mode: 'production',
	entry: './src/table-engine.ts',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'lib/bundled'),
	},
	plugins: [
		new CircularDependencyPlugin({
			exclude: /a\.js|node_modules/,
			include: /src/,
			failOnError: true,
			allowAsyncCycles: false,
			cwd: process.cwd(),
		}),
	],
};
