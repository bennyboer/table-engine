import {Component} from '@angular/core';
import {TableEngine} from "../../../src/main";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public test(): void {
    new TableEngine();
  }

}
