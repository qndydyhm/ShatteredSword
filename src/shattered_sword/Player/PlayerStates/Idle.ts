import AnimatedSprite from "../../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import { PlayerStates } from "../PlayerController";
import OnGround from "./OnGround";

export default class Idle extends OnGround {
	owner: AnimatedSprite;

	onEnter(options: Record<string, any>): void {
		this.parent.speed = this.parent.MIN_SPEED;
	}

	
	update(deltaT: number): void {
		if (this.parent.invincible) {
			this.owner.animation.playIfNotAlready("HURT");
		}
		else {
			this.owner.animation.playIfNotAlready("IDLE", true);
		}
        

		let dir = this.getInputDirection();

		if(!dir.isZero() && dir.y === 0){
			this.finished(PlayerStates.WALK);
		}
		
		this.parent.velocity.x = 0;
		super.update(deltaT);
	}

	onExit(): Record<string, any> {
		this.owner.animation.stop();
		return {};
	}
}