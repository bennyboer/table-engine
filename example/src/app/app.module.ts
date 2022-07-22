import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@NgModule({
	declarations: [AppComponent],
	imports: [
		BrowserModule,
		ColorPickerModule,
		FormsModule,
		BrowserAnimationsModule,
		MatButtonModule,
		MatIconModule,
		MatInputModule,
		MatSelectModule,
		MatTooltipModule,
		MatSnackBarModule,
	],
	providers: [],
	bootstrap: [AppComponent],
})
export class AppModule {}
