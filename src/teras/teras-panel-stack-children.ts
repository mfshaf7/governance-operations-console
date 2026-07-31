import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
} from "react";
import type { ReactNode } from "react";

function flattenPanelStackChildren(
  children: ReactNode,
  parentKey: string,
): ReactNode[] {
  return Children.toArray(children).flatMap((child, index) => {
    const childKey =
      isValidElement(child) && child.key !== null ? child.key : index;
    const compositeKey = `${parentKey}/${String(childKey)}`;

    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    ) {
      return flattenPanelStackChildren(child.props.children, compositeKey);
    }

    return parentKey && isValidElement(child)
      ? [cloneElement(child, { key: compositeKey })]
      : [child];
  });
}

export function terasPanelStackChildren(children: ReactNode): ReactNode[] {
  return flattenPanelStackChildren(children, "");
}
