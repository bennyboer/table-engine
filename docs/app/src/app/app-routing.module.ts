import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MinimalExampleComponent } from './examples/minimal/minimal-example.component';
import { IntroductionComponent } from './guide/introduction/introduction.component';
import { RowColumnHeadersComponent } from './examples/row-column-headers/row-column-headers.component';
import { SetupComponent } from './guide/setup/setup.component';
import { CellRendererComponent } from './guide/cell-renderer/cell-renderer.component';
import { SelectionsComponent } from './guide/selections/selections.component';
import { BordersComponent } from './guide/borders/borders.component';

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
				path: 'selections',
				component: SelectionsComponent,
			},
			{
				path: 'borders',
				component: BordersComponent,
			},
		],
	},
	{
		path: 'examples',
		children: [
			{
				path: 'minimal',
				component: MinimalExampleComponent,
			},
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
