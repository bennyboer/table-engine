import path from 'path';
import { fileURLToPath } from 'url';
import CircularDependencyPlugin from 'circular-dependency-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
	mode: 'production',
	entry: './src/index.ts',
	experiments: {
		outputModule: true,
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'lib/bundled'),
		library: {
			type: 'module',
		},
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
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
	devtool: 'source-map',
};
