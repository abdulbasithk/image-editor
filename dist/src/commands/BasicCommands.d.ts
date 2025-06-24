import { BaseCommand } from '../core/BaseCommand';
import { ImageEditor } from '../core/ImageEditor';
import { CommandData } from '../interfaces/Command';
/**
 * Command for drawing operations on the canvas
 */
export declare class DrawCommand extends BaseCommand {
    private imageDataBefore;
    private imageDataAfter;
    private drawFunction;
    constructor(editor: ImageEditor, name: string, drawFunction: () => void);
    execute(): Promise<void>;
    undo(): Promise<void>;
    getMemoryUsage(): number;
    serialize(): CommandData;
    canMergeWith(command: DrawCommand): boolean;
    mergeWith(command: DrawCommand): DrawCommand;
}
/**
 * Command for canvas clearing operations
 */
export declare class ClearCanvasCommand extends BaseCommand {
    private imageDataBefore;
    private clearColor;
    constructor(editor: ImageEditor, clearColor?: string);
    execute(): Promise<void>;
    undo(): Promise<void>;
    getMemoryUsage(): number;
    serialize(): CommandData;
}
/**
 * Command for text operations
 */
export declare class TextCommand extends BaseCommand {
    private imageDataBefore;
    private text;
    private x;
    private y;
    private style;
    constructor(editor: ImageEditor, text: string, x: number, y: number, style?: {
        font?: string;
        fillStyle?: string;
        textAlign?: CanvasTextAlign;
        textBaseline?: CanvasTextBaseline;
    });
    execute(): Promise<void>;
    undo(): Promise<void>;
    getMemoryUsage(): number;
    serialize(): CommandData;
}
//# sourceMappingURL=BasicCommands.d.ts.map