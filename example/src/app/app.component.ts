import {ChangeDetectionStrategy, Component, ElementRef, ViewChild} from '@angular/core';
import {TableEngine} from "../../../src/main";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {

  @ViewChild("canvas")
  public canvasElement!: ElementRef;

  public test(): void {
    new TableEngine(this.canvasElement.nativeElement as HTMLCanvasElement);
  }

}
