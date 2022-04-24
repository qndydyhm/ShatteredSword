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
import Porcelain from "./Porcelain";
import MainMenu from "./MainMenu";

export default class Tutorial extends GameLevel {
    loadScene(): void {
        super.loadScene();
        this.rmg = new RandomMapGenerator("shattered_sword_assets/jsons/forest_template.json", this.randomSeed);
        this.map = this.rmg.getMap();
        this.load.tilemapFromObject("map", this.map);

        //load enemies
        this.load.spritesheet("Snake","shattered_sword_assets/spritesheets/Snake.json");
        this.load.spritesheet("Tiger","shattered_sword_assets/spritesheets/Tiger.json");

        //can load enemy sprite here
        //sprites obtained from cse380 sprite wesbite
        this.load.spritesheet("remus_werewolf","shattered_sword_assets/spritesheets/remus_werewolf.json");
        this.load.spritesheet("black_pudding","shattered_sword_assets/spritesheets/black_pudding.json");

        //load music here
    }

    updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        
        //spawn snake()
        if(Math.random() < .0001){
            console.log("RANDOM SNAKE!");
            this.addEnemy("Snake", this.player.position.clone().add(new Vec2(0,-320)),{
                player: this.player,
                        health: 50,
                        tilemap: "Main",
                        size: new Vec2(14,10),
                        offset : new Vec2(0, 22),
                        exp: 50,
                        weapon : this.createWeapon("knife")
            })
        }
    }

    protected goToNextLevel(): void {
        this.viewport.setZoomLevel(1);
        this.sceneManager.changeToScene(Porcelain);
    }
}