import React from "react";
import JoyRide, { Callback } from "react-joyride";
import { GreenColor } from "./utils";

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
	},
	{
		target: ".tour-calendar-today",
		content: "Click on a day to see its transactions",
	},
	{
		target: ".tour-calendar-selected-day-details",
		content: "The selected day's transactions show up here",
		placement: "right" as const,
	},
	{
		target: ".tour-transactions",
		content: "Manage your transactions here",
	},
	{
		target: ".tour-add-transaction",
		content: "Add a transaction here",
	},
	{
		target: ".tour-edit-transaction",
		content: "You can edit or remove a transaction here",
	},
];

export default function Tour({ isTourComplete, callback }: { isTourComplete?: boolean; callback: Callback }) {
	return (
		!isTourComplete && (
			<JoyRide
				disableScrolling
				callback={callback}
				steps={TOUR_STEPS}
				continuous
				showSkipButton
				locale={{
					last: "Complete (back to calendar) 🎉",
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
