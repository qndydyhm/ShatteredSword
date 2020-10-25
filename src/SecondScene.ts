import Scene from "./Scene/Scene";
import Rect from "./Nodes/Graphics/Rect";
import Color from "./Utils/Color";
import Vec2 from "./DataTypes/Vec2";
import UIElement from "./Nodes/UIElement";
import Button from "./Nodes/UIElements/Button";
import Layer from "./Scene/Layer";
import { GameEventType } from "./Events/GameEventType";

export default class SecondScene extends Scene {

    loadScene(){
        this.load.tilemap("level2", "assets/tilemaps/TopDown2.json");
        this.load.image("player", "assets/sprites/player.png");
        this.load.audio("music", "assets/sounds/level.wav")

        let loadingScreen = this.addLayer();
        let box = this.add.graphic(Rect, loadingScreen, new Vec2(200, 300), new Vec2(400, 60));
        box.setColor(new Color(0, 0, 0));
        let bar = this.add.graphic(Rect, loadingScreen, new Vec2(205, 305), new Vec2(0, 50));
        bar.setColor(new Color(255, 100, 0));

        this.load.onLoadProgress = (percentProgress: number) => {
            //bar.setSize(295 * percentProgress, bar.getSize().y);
        }

        this.load.onLoadComplete = () => {
            loadingScreen.disable();
        }
    }

    startScene(){
        // // Add the tilemap
        // let mainLayer = this.add.tilemap("level2")[1];
        // mainLayer.setYSort(true);

        // // Add a player
        // let player = this.add.physics(Player, mainLayer, "topdown");
        // let playerSprite = this.add.sprite("player", mainLayer);
        // player.setSprite(playerSprite);

        // this.viewport.follow(player);

        // // Initialize UI
        // let uiLayer = this.addLayer();
        // uiLayer.setParallax(0, 0);

        // let recordButton = this.add.uiElement(Button, uiLayer);
        // recordButton.setSize(100, 50);
        // recordButton.setText("Record");
        // recordButton.setPosition(400, 30);
        // recordButton.onClickEventId = GameEventType.START_RECORDING;

        // let stopButton = this.add.uiElement(Button, uiLayer);
        // stopButton.setSize(100, 50);
        // stopButton.setText("Stop");
        // stopButton.setPosition(550, 30);
        // stopButton.onClickEventId = GameEventType.STOP_RECORDING;

        // let playButton = this.add.uiElement(Button, uiLayer);
        // playButton.setSize(100, 50);
        // playButton.setText("Play");
        // playButton.setPosition(700, 30);
        // playButton.onClickEventId = GameEventType.PLAY_RECORDING;

        // let cycleFramerateButton = this.add.uiElement(Button, uiLayer);
        // cycleFramerateButton.setSize(150, 50);
        // cycleFramerateButton.setText("Cycle FPS");
        // cycleFramerateButton.setPosition(5, 400);
        // let i = 0;
        // let fps = [15, 30, 60];
        // cycleFramerateButton.onClick = () => {
        //     this.game.setMaxUpdateFPS(fps[i]);
        //     i = (i + 1) % 3;
        // }

        // // Pause Menu
        // let pauseLayer = this.addLayer();
        // pauseLayer.setParallax(0, 0);
        // pauseLayer.disable();

        // let pauseButton = this.add.uiElement(Button, uiLayer);
        // pauseButton.setSize(100, 50);
        // pauseButton.setText("Pause");
        // pauseButton.setPosition(700, 400);
        // pauseButton.onClick = () => {
        //     this.sceneGraph.getLayers().forEach((layer: Layer) => layer.setPaused(true));
        //     pauseLayer.enable();
        // }

        // let modalBackground = this.add.uiElement(UIElement, pauseLayer);
        // modalBackground.setSize(400, 200);
        // modalBackground.setBackgroundColor(new Color(0, 0, 0, 0.4));
        // modalBackground.setPosition(200, 100);

        // let resumeButton = this.add.uiElement(Button, pauseLayer);
        // resumeButton.setSize(100, 50);
        // resumeButton.setText("Resume");
        // resumeButton.setPosition(400, 200);
        // resumeButton.onClick = () => {
        //     this.sceneGraph.getLayers().forEach((layer: Layer) => layer.setPaused(false));
        //     pauseLayer.disable();
        // }
    }
}