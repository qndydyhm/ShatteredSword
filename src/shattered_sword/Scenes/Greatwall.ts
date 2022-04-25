import { TiledTilemapData } from "../../Wolfie2D/DataTypes/Tilesets/TiledData";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Debug from "../../Wolfie2D/Debug/Debug";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import RandomMapGenerator from "../Tools/RandomMapGenerator";
import GameLevel from "./GameLevel";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import Color from "../../Wolfie2D/Utils/Color";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import { Statuses } from "../sword_enums";
import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import EnemyAI from "../AI/EnemyAI";
import BattlerAI from "../AI/BattlerAI";

export default class Greatwall extends GameLevel {
    loadScene(): void {
        super.loadScene();
        this.rmg = new RandomMapGenerator("shattered_sword_assets/jsons/greatwall_template.json", this.randomSeed);
        this.map = this.rmg.getMap();
        console.log(this.map);
        this.load.tilemapFromObject("map", this.map);

        //load enemies

        //can load enemy sprite here
        //sprites obtained from cse380 sprite wesbite
        // this.load.spritesheet("black_pudding","shattered_sword_assets/spritesheets/black_pudding.json");

        //load music here
    }
}