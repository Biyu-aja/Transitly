declare module 'react-quill' {
  import * as React from 'react';
  
  export interface ReactQuillProps {
    value?: string | null;
    defaultValue?: string;
    readOnly?: boolean;
    theme?: string;
    modules?: Record<string, any>;
    formats?: string[];
    bounds?: string | HTMLElement;
    scrollingContainer?: string | HTMLElement;
    placeholder?: string;
    preserveWhitespace?: boolean;
    onChange?: (content: string, delta: any, source: string, editor: any) => void;
    onChangeSelection?: (selection: any, source: string, editor: any) => void;
    onFocus?: (selection: any, source: string, editor: any) => void;
    onBlur?: (previousSelection: any, source: string, editor: any) => void;
    onKeyDown?: React.EventHandler<any>;
    onKeyPress?: React.EventHandler<any>;
    onKeyUp?: React.EventHandler<any>;
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    tabIndex?: number;
    children?: React.ReactElement<any>;
  }

  export default class ReactQuill extends React.Component<ReactQuillProps> {
    focus(): void;
    blur(): void;
    getEditor(): any;
  }
}
