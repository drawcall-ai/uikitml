# Reject Unknown Tags

UIKitML rejects any tag outside the known component set instead of falling back to a generic container. This deliberately differs from upstream pmndrs/uikitml because Drawcall's parser should know the available UIKit components for a parse operation and produce clear source-range errors when markup names something unavailable.
