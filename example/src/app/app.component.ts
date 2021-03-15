import { Component } from '@angular/core';
import {Test} from "../../../src/public";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public test(): string {
    return Test.test();
  }

}
