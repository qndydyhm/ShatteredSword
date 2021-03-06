
import Game from "./Wolfie2D/Loop/Game";
import MainMenu from "./shattered_sword/Scenes/MainMenu";
import RegistryManager from "./Wolfie2D/Registry/RegistryManager";
import WeaponTemplateRegistry from "./shattered_sword/Registry/WeaponRegistry";
import WeaponTypeRegistry from "./shattered_sword/Registry/WeaponTypeRegistry";
import SplashScreen from "./shattered_sword/Scenes/SplashScreen";
// The main function is your entrypoint into Wolfie2D. Specify your first scene and any options here.
(function main(){
    // Run any tests
    runTests();

    // Set up options for our game
    let options = {
        canvasSize: {x : 1280, y:720},
        //canvasSize: {x: window.innerWidth, y: window.innerHeight},          // The size of the game
        clearColor: {r: 0, g: 0, b: 0},   // The color the game clears to
        inputs: [
            {name: "left", keys: ["a", "arrowleft"]},    //TODO - add arrow keys
            {name: "right", keys: ["d", "arrowright"]},
            {name: "up", keys: ["w", "arrowup"]},
            {name: "down", keys: ["s", "arrowdown"]},
            {name: "jump", keys: ["z", "space"]},
            {name: "attack", keys: ["j","x","enter"]},  
            {name: "dash", keys: ["k","c"]},    //
            {name: "skill", keys: ["l","v"]},
            {name: "inventory", keys: ["i","b"]},
            {name: "pause", keys: ["escape"]},    
            {name: "tab", keys: ["tab"]},
            {name: "buff1", keys: ["1"]},
            {name: "buff2", keys: ["2"]},
            {name: "buff3", keys: ["3"]}
        ],
        useWebGL: false,                        // Tell the game we want to use webgl
        showDebug: false                      // Whether to show debug messages. You can change this to true if you want
    }


    // Set up custom registries
    let weaponTemplateRegistry = new WeaponTemplateRegistry();
    RegistryManager.addCustomRegistry("weaponTemplates", weaponTemplateRegistry);
    
    let weaponTypeRegistry = new WeaponTypeRegistry();
    RegistryManager.addCustomRegistry("weaponTypes", weaponTypeRegistry);

    // Create a game with the options specified
    const game = new Game(options);

    // Start our game
    game.start(SplashScreen, {});   
    //TODO - change to splash screen once available
    //game.start(SplashScreen,{});
})();

function runTests(){};