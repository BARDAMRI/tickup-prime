import React from 'react';
import {ToolbarVerticalButton} from '../../styles/Toolbar.styles';
import {ButtonProps, ModeButtonProps} from "../../types/buttons";
import {ToolbarHorizontalButtons} from "../../styles/SettingsToolbar.styles";


export const ModeButton: React.FC<ModeButtonProps> = ({mode, currentMode, onClickHandler, children, className, disabled = false}) => {

    return (
        <ToolbarVerticalButton
            className={className}
            $selected={mode === currentMode}
            disabled={disabled}
            onClick={() => onClickHandler(mode)}
        >
            {children}
        </ToolbarVerticalButton>
    );
};

export const Button: React.FC<ButtonProps> = ({onClickHandler, children, className}) => {

    return (
        <ToolbarHorizontalButtons
            className={className}
            onClick={() => onClickHandler()}
        >
            {children}
        </ToolbarHorizontalButtons>
    );
};
