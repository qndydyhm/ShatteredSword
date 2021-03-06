import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import RandomMapGenerator from "../Tools/RandomMapGenerator";
import GameLevel from "./GameLevel";
import SnakeAI from "../AI/SnakeAI";
import Porcelain from "./Porcelain";
import InputWrapper from "../Tools/InputWrapper";

export default class Forest extends GameLevel {
    loadScene(): void {
        super.loadScene();
        this.rmg = new RandomMapGenerator("shattered_sword_assets/jsons/forest_template.json", InputWrapper.randomSeed);
        this.map = this.rmg.getMap();
        this.load.tilemapFromObject("map", this.map);

        //load enemies
        this.load.spritesheet("Snake","shattered_sword_assets/spritesheets/Snake.json");
        this.load.spritesheet("black_pudding","shattered_sword_assets/spritesheets/black_pudding.json");
    }

    updateScene(deltaT: number): void {
        super.updateScene(deltaT);
        
        //spawn snake()
        if(Math.random() < .0001 && this.gameStarted){
            console.log("RANDOM SNAKE!");
            this.addEnemy("Snake", this.player.position.clone().add(new Vec2(0,-320)), SnakeAI, {
                player: this.player,
                        health: 50,
                        tilemap: "Main",
                        size: new Vec2(14,10),
                        offset : new Vec2(0, 22),
                        exp: 50,
            })
        }
    }

    protected goToNextLevel(): void {
        this.viewport.setZoomLevel(1);
        let sceneOptions = {
            physics: {
                groupNames: ["ground", "player", "enemies"],
                collisions:
                [
                    [0, 1, 1],
                    [1, 0, 0],
                    [1, 0, 0]
                ]
            }
        }
        this.sceneManager.changeToScene(Porcelain, {}, sceneOptions);
    }

    protected playStartStory(): void {
        if (!this.touchedStartCheckPoint) {
            this.touchedStartCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level1story.json");
            this.startTimer();
        }
    }

    protected playEndStory() {
        if (!this.touchedEndCheckPoint) {
            this.touchedEndCheckPoint = true;
            this.storyLoader("shattered_sword_assets/jsons/level1endstory.json");
            this.endTimer();
            this.levelEnded = true;
        }
    }
}