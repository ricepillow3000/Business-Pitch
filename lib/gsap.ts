"use client";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase, ScrambleTextPlugin, ScrollTrigger, SplitText, useGSAP);

  /*
   * THE MOTION SIGNATURE — one expo curve, cut in half.
   *
   *   "reach"  = the first half of an expo.inOut. Starts dead still, builds pressure,
   *              ends at maximum velocity. Used for anything gathering energy.
   *   "split"  = the second half. Leaves at maximum velocity, then decays to a
   *              long, quiet stop. Used for anything releasing energy.
   *
   * Played back to back, the velocity is continuous at the seam, so reach → split
   * reads as ONE gesture (anticipation → release), not two animations.
   * Every other tween on the site uses expo.out / expo.inOut from the same family,
   * so the whole site moves with a single "voice".
   */
  CustomEase.create("reach", "M0,0 C0.7,0 0.84,0 1,1");
  CustomEase.create("split", "M0,0 C0.16,1 0.3,1 1,1");

  gsap.defaults({ ease: "expo.out", duration: 1.1 });
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
