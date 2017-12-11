Adaptive Cities Platform Glossary
=================================

v0.2 - 2017-12-11

JOURNEY
-------

A sequence of vehicle **LOCATION**s. There are several sub-types:

* **JOURNEY PATTERN**: A template for a **JOURNEY** appearing in a
**TIMETABLE**, characterised by its departure time (but _not_ date), its
**OPEARTING PROFILE**, its **ORIGIN STOP POINT**, sequence of subsequent
**STOP POINT**s and its **DESTINATION STOP POINT**.

* **VEHICLE JOURNEY**: A predicted **JOURNEY** appearing in a
**TIMETABLE**, characterised by its **JOURNEY PATTERN** and date.

* **MONITORED VEHICLE JOURNEY**: An actual **JOURNEY** as reported by
real-time monitoring data (such as SIRI-VM), characterised by a series
of time-stamped **LOCATIONS** and potentially the ID of the vehicle
performing the **JOURNEY**, data about the corresponding **VEHICLE
JOURNEY**, etc.

LINE
----

An advertised service, commonly refereed to as a 'route'. E.g. the
'Universal' and 'CITI 7' bus services.

Represents a series of bus services traversing roughly similar
**PATH**s, often in two or more directions. A **LINE** may involve more
than one **PATH**, with  variations typically at their ends or early in
the morning and late in the evening. **LINE**s typically have an
associated **TIMETABLE**.

LOCATION
--------

A real world position, typically characterised by a WGS 84 latitude,
longitude and elevation triplet (or something that can be converted to
that).

OPERATING PROFILE
-----------------

A definition of the days on which a **JOURNEY PATTERN** operates,
charactised by the days of the the week on which it operates, Bank
Holidays on which it does or does not operate, and arbitrary date ranges
of operation or non-operation.

PATH
----

The representation of the actual **LOCATION**s traversed by a vehicle.

SEGMENT
-------

The section of a **JOURNEY** between **STOP POINTS** (or before an 
**ORIGIN STOP POINT** or after a **DESTINATION STOP POINT**). Also:

** JOURNEY PATTERN SEGMENT**: The straight-line between adjacent **STOP 
POINTS**.
** PATH SEGMENT: The section of a **PATH** between adjacent **STOP 
POINTS**.

STOP POINT
----------

Physical places where passengers can board and/or alight from
vehicles, characterised by a **LOCATION** and one or more identifiers.
Also

* **ORIGIN STOP POINT**: The start point for a **JOURNEY**
* **DESTINATION STOP POINT**: The end point for a **JOURNEY**

TIMETABLE
---------

A published set of **VEHICLE JOURNEYS** that have been or will be made
in some time frame. Often presented separated by **LINE**, direction,
and day of the week. Also:

* **MATRIX TIMETABLE**: a **TIMETABLE** presentation that displays
**STOP POINTS** in a column on the left followed by corresponding
**VEHICLE JOURNEY**s in subsequent columns showing the time a vehicle will
visit each **STOP POINT**.
