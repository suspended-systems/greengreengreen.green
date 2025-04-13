import React from "react";
import JoyRide, { Callback } from "react-joyride";

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
		content: "You can click on a day to see its transactions",
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
		content: "You can edit or remove a transaction by hovering it",
	},
];

const Tour = ({ callback }: { callback: Callback }) => {
	return (
		<JoyRide
			run={true}
			callback={callback}
			steps={TOUR_STEPS}
			continuous={true}
			showSkipButton={true}
			showProgress={true}
			styles={{
				tooltipContainer: {
					textAlign: "left",
				},
				buttonNext: {
					backgroundColor: "green",
				},
				buttonBack: {
					marginRight: 10,
				},
			}}
		/>
	);
};

export default Tour;
