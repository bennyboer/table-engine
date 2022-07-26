import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MinimalExampleComponent } from './examples/minimal/minimal-example.component';
import { IntroductionComponent } from './guide/introduction/introduction.component';
import { RowColumnHeadersComponent } from './examples/row-column-headers/row-column-headers.component';
import { SetupComponent } from './guide/setup/setup.component';
import { CellRendererComponent } from './guide/cell-renderer/cell-renderer.component';
import { SelectionsComponent } from './guide/selections/selections.component';
import { BordersComponent } from './guide/borders/borders.component';
import { HIGHLIGHT_OPTIONS, HighlightModule } from 'ngx-highlightjs';

@NgModule({
	declarations: [
		AppComponent,
		IntroductionComponent,
		SetupComponent,
		CellRendererComponent,
		SelectionsComponent,
		BordersComponent,
		MinimalExampleComponent,
		RowColumnHeadersComponent,
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		BrowserAnimationsModule,
		HighlightModule,
		MatSidenavModule,
		MatIconModule,
		MatToolbarModule,
		MatButtonModule,
		MatListModule,
	],
	providers: [
		{
			provide: HIGHLIGHT_OPTIONS,
			useValue: {
				coreLibraryLoader: () => import('highlight.js/lib/core'),
				lineNumbersLoader: () => import('highlightjs-line-numbers.js'),
				languages: {
					typescript: () =>
						import('highlight.js/lib/languages/typescript'),
					css: () => import('highlight.js/lib/languages/css'),
					xml: () => import('highlight.js/lib/languages/xml'),
					shell: () => import('highlight.js/lib/languages/shell'),
				},
				themePath: 'assets/github.css',
			},
		},
	],
	bootstrap: [AppComponent],
})
export class AppModule {}
