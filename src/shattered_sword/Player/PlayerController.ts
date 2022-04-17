import StateMachineAI from "../../Wolfie2D/AI/StateMachineAI";
import GameNode, { TweenableProperties } from "../../Wolfie2D/Nodes/GameNode";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import OrthogonalTilemap from "../../Wolfie2D/Nodes/Tilemaps/OrthogonalTilemap";
import { Player_Events } from "../sword_enums";
import Fall from "./PlayerStates/Fall";
import Idle from "./PlayerStates/Idle";
import InAir from "./PlayerStates/InAir";
import Jump from "./PlayerStates/Jump";
import Walk from "./PlayerStates/Walk";
import Debug from "../../Wolfie2D/Debug/Debug";
import Item from "../GameSystems/items/Item";
import InventoryManager from "../GameSystems/InventoryManager";
import Input from "../../Wolfie2D/Input/Input";
import BattlerAI from "../AI/BattlerAI";
import MathUtils from "../../Wolfie2D/Utils/MathUtils";
import Weapon from "../GameSystems/items/Weapon";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";


export enum PlayerType {
    PLATFORMER = "platformer",
    TOPDOWN = "topdown"
}

export enum PlayerStates {
    IDLE = "idle",
    WALK = "walk",
	JUMP = "jump",
    FALL = "fall",
	PREVIOUS = "previous"
}

export enum BuffType {
    ATK = "attack",
    DEF = "defence",
    HEALTH = "health",
    SPEED = "speed",
    RANGE = "range"
}


export class Buff  {
    "type": BuffType;
    "value": number;
    //"bonus": boolean,         //need to determine what bonus gives
}

type Buffs = [
    Buff, Buff, Buff
]

//TODO - discuss max stats during refinement, unused for now
export default class PlayerController extends StateMachineAI implements BattlerAI{
    owner: GameNode;
    velocity: Vec2 = Vec2.ZERO;
    //will need to discuss redundant stats
	speed: number = 200;
	MIN_SPEED: number = 200;
    MAX_SPEED: number = 300;
    BASE_HP: number = 100;
    MAX_HP: number = 100;
    CURRENT_HP: number = 100;
    BASE_ATK: number = 100;
    MAX_ATK: number = 100;
    CURRENT_ATK: number = 100;
    BASE_DEF: number = 100;
    MAX_DEF: number = 100;
    CURRENT_DEF: number = 100;
    CURRENT_EXP : number = 0;
    MAX_EXP : number = 100;

    invincible : boolean = false;

    tilemap: OrthogonalTilemap;

    //for doublejumps maybe = # of jumps in air allowed
    MAX_airjumps: number = 1;
    airjumps:number = 0;
    
    private lookDirection: Vec2;

    /** A list of items in the game world */
    private items: Array<Item>;

    // The inventory of the player
    inventory: InventoryManager;

    CURRENT_BUFFS: {
        atk: number;    //flat value to add to weapon
        hp: number;     //flat value 
        def: number;    //flat value
        speed: number;  //flat value
        range:number;   //range will be a multiplier value: 1.5 = 150% range
    }
    
    
    // TODO - 
    damage(damage: number): void {
        if( !this.invincible){
            (<AnimatedSprite>this.owner).animation.play("HURT", false);
            this.CURRENT_HP -= damage;
        }
    }

	/**
	 * Returns three legal random generate buffs based on current state
	 * @returns Three buffs
	 */
    static getBuffs(): Buffs {
        // TODO
        return undefined;
    }

    //TODO - balance buff value generation 
    /**
     * returns an array of three randomly generated buffs 
     * @param val optional value to give buff
     * @returns array of three Buffs
     */
    static generateBuffs( val? : number) : Buff[]{
        let num = Number(Math.random().toPrecision(1)) * 10;    //random number from 1 to 10 if no value given
        if(typeof val !== 'undefined'){
            num = val;
        }
        
        let array : Buff[] = [
            {type:BuffType.ATK, value:num},
            {type:BuffType.HEALTH, value:num},
            {type:BuffType.DEF, value:num},
            {type:BuffType.SPEED, value:num},
            {type:BuffType.RANGE, value:num/10} //range is a multiplier percent
        ];

        // Shuffle array
        const shuffled = array.sort(() => 0.5 - Math.random());

        // Get sub-array of first 3 elements after shuffled
        let selected = shuffled.slice(0, 3);

        return selected;
    }

    /**
	 * Add given buff to the player
	 * @param buff Given buff
	 */
    addBuff(buff: Buff): void {
        // TODO
        let item = this.inventory.getItem();
            
        switch(buff.type){
            case BuffType.HEALTH:
                this.CURRENT_BUFFS.hp += buff.value;
                this.CURRENT_HP += buff.value;
                break;
            case BuffType.ATK:
                //TODO - decide what to do with atk stat
                this.CURRENT_BUFFS.atk += buff.value;
                if (item) {
                    (<Weapon>item).EXTRA_DAMAGE += buff.value;
                }
                break;
            case BuffType.SPEED:
                this.CURRENT_BUFFS.speed += buff.value;
                this.speed += buff.value;
                break;
            case BuffType.DEF:
                this.CURRENT_BUFFS.def += buff.value;
                this.CURRENT_DEF += buff.value;
                break;
            case BuffType.RANGE:
                this.CURRENT_BUFFS.range += buff.value;
                if (item) {
                    (<Weapon>item).EXTRA_RANGE += buff.value;
                }
                break;
        }
    }

    

    //TODO - get the correct tilemap
    initializeAI(owner: GameNode, options: Record<string, any>){
        this.owner = owner;

        this.initializePlatformer();

        this.tilemap = this.owner.getScene().getTilemap(options.tilemap) as OrthogonalTilemap;
      
        this.inventory  = options.inventory;

        this.lookDirection = new Vec2();

        this.CURRENT_BUFFS = {hp:0, atk:0, def:0, speed:0, range:0};
       
        //to test the buffs
        this.addBuff( {type:BuffType.HEALTH, value:1} );
        //this.addBuff( {type:BuffType.RANGE, value:1, bonus:false} );
    }

    initializePlatformer(): void {
        this.speed = 400;

        let idle = new Idle(this, this.owner);
		this.addState(PlayerStates.IDLE, idle);
		let walk = new Walk(this, this.owner);
		this.addState(PlayerStates.WALK, walk);
		let jump = new Jump(this, this.owner);
        this.addState(PlayerStates.JUMP, jump);
        let fall = new Fall(this, this.owner);
        this.addState(PlayerStates.FALL, fall);
        
        this.initialize(PlayerStates.IDLE);
    }

    changeState(stateName: string): void {
        // If we jump or fall, push the state so we can go back to our current state later
        // unless we're going from jump to fall or something
        if((stateName === PlayerStates.JUMP || stateName === PlayerStates.FALL) && !(this.stack.peek() instanceof InAir)){
            this.stack.push(this.stateMap.get(stateName));
        }

        super.changeState(stateName);
    }

    update(deltaT: number): void {
		super.update(deltaT);

		if(this.currentState instanceof Jump){
			Debug.log("playerstate", "Player State: Jump");
		} else if (this.currentState instanceof Walk){
			Debug.log("playerstate", "Player State: Walk");
		} else if (this.currentState instanceof Idle){
			Debug.log("playerstate", "Player State: Idle");
		} else if(this.currentState instanceof Fall){
            Debug.log("playerstate", "Player State: Fall");
        }
        Debug.log("player speed", "player speed: x: " + this.velocity.x + ", y:" + this.velocity.y);
        Debug.log("player Coords:", "Player Coords:" +this.owner.position );

        //testing the attacks here, may be moved to another place later
        if(Input.isJustPressed("attack")){
            let item = this.inventory.getItem();
            (<AnimatedSprite>this.owner).animation.playIfNotAlready("ATTACK", true);
            //TODO - get proper look direction 
            this.lookDirection.x = (<Sprite>this.owner).invertX ? -1 : 1;
            // If there is an item in the current slot, use it
            if (item) {
                item.use(this.owner, "player", this.lookDirection);
            }
        }
        
	}

    


}