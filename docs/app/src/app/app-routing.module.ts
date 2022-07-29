import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IntroductionComponent } from './guide/introduction/introduction.component';
import { RowColumnHeadersComponent } from './examples/row-column-headers/row-column-headers.component';
import { SetupComponent } from './guide/setup/setup.component';
import { CellRendererComponent } from './guide/cell-renderer/cell-renderer.component';
import { SelectionsComponent } from './guide/selections/selections.component';
import { BordersComponent } from './guide/borders/borders.component';
import { CellModelComponent } from './guide/cell-model/cell-model.component';
import { ThemingComponent } from './guide/theming/theming.component';
import { NextComponent } from './guide/next/next.component';

const routes: Routes = [
	{
		path: 'guide',
		children: [
			{
				path: 'introduction',
				component: IntroductionComponent,
			},
			{
				path: 'setup',
				component: SetupComponent,
			},
			{
				path: 'cell-renderer',
				component: CellRendererComponent,
			},
			{
				path: 'cell-model',
				component: CellModelComponent,
			},
			{
				path: 'selections',
				component: SelectionsComponent,
			},
			{
				path: 'borders',
				component: BordersComponent,
			},
			{
				path: 'theming',
				component: ThemingComponent,
			},
			{
				path: 'next',
				component: NextComponent,
			},
		],
	},
	{
		path: 'examples',
		children: [
			{
				path: 'row-column-headers',
				component: RowColumnHeadersComponent,
			},
		],
	},
	{ path: '**', redirectTo: '/guide/introduction' },
];

@NgModule({
	imports: [
		RouterModule.forRoot(routes, {
			useHash: true,
			scrollPositionRestoration: 'top',
		}),
	],
	exports: [RouterModule],
})
export class AppRoutingModule {}
