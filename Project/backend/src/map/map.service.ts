import { Injectable } from "@nestjs/common";
import { Path } from "./map.type";

@Injectable()
export class MapService {
  getPaths(): Path[] {
    return [
      {
        id: "p1",
        condition: "good",
        coordinates: [
          [45.4642, 9.19],
          [45.468, 9.2],
          [45.472, 9.205],
        ],
      },
      {
        id: "p2",
        condition: "poor",
        coordinates: [
          [45.462, 9.18],
          [45.458, 9.175],
          [45.455, 9.17],
        ],
      },
    ];
  }
}
