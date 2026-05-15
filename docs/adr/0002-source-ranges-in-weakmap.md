# Source Ranges In A WeakMap

Successful parses return source range metadata in a `WeakMap` keyed by real pmndrs/uikit component objects instead of storing ranges in component props or assigning serialized node IDs. This keeps editor integration ergonomic for live component objects while avoiding pollution of UIKit component data; callers that need serialized mappings can build them as a later layer.
