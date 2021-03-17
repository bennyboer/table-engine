import {ChangeDetectionStrategy, Component, ElementRef, ViewChild} from "@angular/core";
import {TableEngine} from "table-engine/table-engine";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {

  @ViewChild("canvas")
  public canvasElement!: ElementRef;

  public test(): void {
    console.log("Test!");

    const engine = new TableEngine(this.canvasElement.nativeElement as HTMLCanvasElement);

    console.log(engine.getCellModel().getWidth());
  }

}
