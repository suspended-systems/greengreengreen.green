import React from "react";
import JoyRide, { Callback } from "react-joyride";
import { GreenColor } from "@/app/utils";

const TOUR_STEPS = [
	{
		target: ".tour-starting",
		content: "Choose your starting values to project from",
		disableBeacon: true,
	},
	{
		target: ".tour-calendar",
		content: "Each calendar day displays your projected balance and transactions",
		placement: "left" as const,
		disableBeacon: true,
	},
	{
		target: ".tour-calendar-today",
		content: "Click on a day to see its transactions",
		disableBeacon: true,
	},
	{
		target: ".tour-calendar-selected-day-details",
		content: "The selected day's transactions show up here",
		placement: "right" as const,
		disableBeacon: true,
	},
	{
		target: ".tour-transactions",
		content: "Manage your transactions here",
		disableBeacon: true,
	},
	{
		target: ".tour-add-transaction",
		content: "Add a transaction here",
		disableBeacon: true,
	},
	{
		target: ".tour-edit-transaction",
		content: "You can edit or remove a transaction here",
		disableBeacon: true,
	},
];

export default function Tour({ isTourComplete, callback }: { isTourComplete?: boolean; callback: Callback }) {
	return (
		!isTourComplete && (
			<JoyRide
				disableOverlay
				// disableScrolling
				callback={callback}
				steps={TOUR_STEPS}
				continuous
				showSkipButton
				locale={{
					last: "Complete 🎉",
				}}
				styles={{
					tooltipContainer: {
						textAlign: "left",
					},
					buttonNext: {
						backgroundColor: GreenColor,
					},
					buttonBack: {
						marginRight: 10,
						color: "black",
					},
					beaconInner: {
						backgroundColor: GreenColor,
					},
					beaconOuter: {
						// 0x33 / 0.2 alpha
						backgroundColor: `${GreenColor}33`,
						borderColor: GreenColor,
					},
				}}
			/>
		)
	);
}
