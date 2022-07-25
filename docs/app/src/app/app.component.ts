import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ViewChild,
} from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, Observable, tap, withLatestFrom } from 'rxjs';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
	@ViewChild('drawer')
	drawer?: MatSidenav;

	isMobile: boolean = false;

	private isMobile$: Observable<boolean> = this.breakpointObserver
		.observe(Breakpoints.Handset)
		.pipe(
			map((result) => result.matches),
			tap((result) => (this.isMobile = result)),
			tap(() => this.cd.markForCheck())
		);

	constructor(
		private readonly breakpointObserver: BreakpointObserver,
		private readonly cd: ChangeDetectorRef,
		router: Router
	) {
		router.events
			.pipe(
				withLatestFrom(this.isMobile$),
				filter(([a, b]) => b && a instanceof NavigationEnd)
			)
			.subscribe((_) => this.drawer?.close());
	}
}
