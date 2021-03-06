
import GameNode from "../../Wolfie2D/Nodes/GameNode";
import BattlerAI from "../AI/BattlerAI";
import Weapon from "./items/Weapon";
import PlayerController from "../Player/PlayerController";
import EnemyAI from "../AI/EnemyAI";

export default class BattleManager {
    players: Array<BattlerAI>;

    enemies: Array<BattlerAI>;

    handleInteraction(attackerType: string, weapon: Weapon, user?: GameNode) {
        //may be unneeded since we are controlling the player - 
        //we determine enemy collision there
        
        if (attackerType === "player") {
            // Check for collisions with enemies
            if(this.enemies.length != 0){
                for (let enemy of this.enemies) {
                    if (weapon.hits(enemy.owner)) {

                        let player = (<PlayerController>this.players[0]);

                        if(player.fullHpBonus){
                            enemy.damage(Math.round( weapon.type.damage * (<PlayerController>this.players[0]).CURRENT_ATK/10));
                        }
                        else{
                            enemy.damage(Math.round(weapon.type.damage * (<PlayerController>this.players[0]).CURRENT_ATK/100));
                        }
                        //console.log("enemy took dmg");
                        
                        //add checking for each onhit buff here
                        
                        //DOTS
                        if(player.hasBleed){
                            (<EnemyAI>enemy).bleedCounter +=3;
                        }
                        if(player.hasPoison){
                            (<EnemyAI>enemy).poisonCounter =5 ;
                        }
                        if(player.hasBurn){
                            (<EnemyAI>enemy).burnCounter =5 ;
                        }

                        
                        if(player.hasLifesteal){
                            player.addHealth(Math.round(weapon.type.damage * player.CURRENT_ATK/100 * player.lifestealratio));
                        }
                    }
                }
            }
        } else {
            // Check for collision with player
            for (let player of this.players) {
                if (weapon.hits(player.owner)) {
                    (<PlayerController>player).damage(weapon.type.damage, user);
                    if((<PlayerController>player).hasShield){
                        (<PlayerController>player).addShield(weapon.type.damage * .5);  //half of dmg taken is converted to shield
                    }
                }
            }
        }
        

    }

    setPlayers(player: Array<BattlerAI>): void {
        this.players = player;
    }

    setEnemies(enemies: Array<BattlerAI>): void {
        this.enemies = enemies;
    }

    addEnemy(enemy : BattlerAI){
        this.enemies.push(enemy);
    }

    removeEnemy(enemy : BattlerAI){
       
        
        this.enemies = this.enemies.filter(item => item !== enemy)
        if(this.enemies.length == 0){
            this.enemies = new Array();
        }
        return this.enemies;
          
    }
}